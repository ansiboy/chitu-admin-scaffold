import { controller, action, Controller, getLogger, serverContext, ServerContext, VirtualDirectory, routeData } from "maishu-node-mvc";
import path = require("path");
import fs = require("fs");
import os = require("os");
import { ServerContextData } from "../settings";
import { WebsiteConfig } from "../static/types";
import { PROJECT_NAME } from "../global";
import { commonjsToAmd } from "../js-transform";
import { errors } from "../errors";
import JSON5 = require("json5");

/** 
 * Home 控制器 
 */
@controller("/")
export class HomeController extends Controller {

    /** 
     * Index 页面，用于测试 
     */
    @action()
    index() {
        return 'Hello World'
    }

    /** 
     * 客户端初始化脚本 
     */
    @action("/clientjs_init.js")
    initjs(@serverContext context: ServerContext<ServerContextData>) {
        let initJS = `define([],function(){
            return {
                default: function(){
                    
                }
            }
        })`;

        let initJSPath = context.data.staticRoot.getFile("init.js")
        if (initJSPath && fs.existsSync(initJSPath)) {
            let buffer = fs.readFileSync(initJSPath);
            initJS = buffer.toString();
            initJS = commonjsToAmd(initJS);
        }

        return initJS;
    }

    /**
     * 获取客户端文件
     * @param settings 设置，由系统注入。   
     */
    @action("/clientFiles")
    getClientFiles(@serverContext context: ServerContext<ServerContextData>): string[] {
        console.assert(context.data.staticRoot != null);

        let clientFiles = [];
        let staticDir = context.data.rootDirectory.getDirectory("static");
        if (staticDir == null) {
            let logger = getLogger(PROJECT_NAME);
            logger.warn("Static directory is not exists.");
            return clientFiles;
        }

        let stack: VirtualDirectory[] = [staticDir];
        while (stack.length > 0) {
            let dir = stack.pop();
            let filesDic = dir.getChildFiles();
            let files = Object.getOwnPropertyNames(filesDic)
                .map(n => path.join(dir.getVirtualPath().substr("static/".length), n));

            clientFiles.push(...files);

            let childrenDic = dir.getChildDirectories();
            for (let name in childrenDic) {

                if (name == "node_modules" || name == "lib")
                    continue;

                stack.push(childrenDic[name]);
            }
        }

        if (os.platform() == "win32") {
            clientFiles.forEach((p, i) => {
                clientFiles[i] = p.replace(/\\/g, "/")
            })
        }

        return clientFiles;
    }

    /**
     * 获取站点配置
     * @param context 设置，由系统注入。   
     */
    @action("/websiteConfig")
    websiteConfig(@serverContext context: ServerContext<ServerContextData>): WebsiteConfig {
        return HomeController.getWebsiteConfig(context.data)
    }

    static getWebsiteConfig(data: ServerContextData) {
        let config = {} as WebsiteConfig;
        let staticConfigPath: string;

        if (data.websiteConfig == null) {
            staticConfigPath = data.rootDirectory.getFile("website-config.js"); //path.join(data.rootDirectory, "website-config.js");
        }
        else {
            config = data.websiteConfig;
        }

        let logger = getLogger(PROJECT_NAME);
        if (staticConfigPath) {
            let mod = require(staticConfigPath);
            logger.info(`Website config is ${JSON.stringify(mod)}`);
            if (mod["default"] == null) {
                logger.error(`Website config file '${staticConfigPath}' has not default export.`);
            }
            let modDefault = mod["default"] || {};
            if (typeof modDefault == "function") {
                config = modDefault(data || {});
            }
            else {
                config = modDefault;
            }
        }
        else {
            logger.warn(`Website config file  is not exists.`)
        }

        if (data.station) {
            config.gateway = data.station.gateway;
        }
        let r = Object.assign({}, defaultConfig, config);
        r.requirejs.paths = Object.assign(defaultPaths, r.requirejs.paths || {});
        r.requirejs.shim = Object.assign(defaultShim, r.requirejs.shim || {});
        if (data.websiteConfig != null && data.websiteConfig.requirejs != null) {
            r.requirejs.shim = Object.assign(r.requirejs.shim || {}, data.websiteConfig.requirejs.shim || {});
            r.requirejs.paths = Object.assign(r.requirejs.paths, data.websiteConfig.requirejs.paths || {});
        }

        return r;
    }

    @action("*.js")
    commonjsToAmd(@routeData data, @serverContext context: ServerContext<ServerContextData>) {
        console.assert(data != null);

        if (data["_"] == "clientjs_init") {
            return this.initjs(context);
        }

        let filePath = data["_"] as string;
        console.assert(filePath != null);
        if (filePath[0] == '/') {
            filePath = filePath.substr(1);
        }


        let jsFileVirtualPath = filePath + ".js";
        let jsxFileVirtualPath = filePath + ".jsx";

        let filePhysicalPath = context.data.staticRoot.getFile(jsFileVirtualPath, false);
        if (filePhysicalPath == null)
            filePhysicalPath = context.data.staticRoot.getFile(jsxFileVirtualPath, false);

        if (filePhysicalPath == null) {
            let error = new Error(`File '${jsFileVirtualPath}' or '${jsxFileVirtualPath}' not found, search in ${context.data.staticRoot.getPhysicalPaths()}.`);
            throw error;
        }

        let convertToAmd: boolean = false;
        let toAmd = context.data.commonjsToAmd || [];
        for (let i = 0; i < toAmd.length; i++) {
            let regex = new RegExp(toAmd[i]);
            if (regex.test(filePhysicalPath)) {
                convertToAmd = true;
                break;
            }
        }

        //===========================================================================
        let buffer = fs.readFileSync(filePhysicalPath);
        let originalCode = buffer.toString();
        if (convertToAmd == false) {
            let content = `/** MVC Action: commonjsToAmd, source file is ${filePhysicalPath} */ \r\n` + originalCode;
            return this.content(content, { physicalPath: filePhysicalPath });
        }
        //===========================================================================

        let content: string = null;
        let code = commonjsToAmd(originalCode);
        content = `/** MVC Action: commonjsToAmd, transform to javascript amd, source file is ${filePhysicalPath} */ \r\n` + code;

        return this.content(content, { physicalPath: filePhysicalPath });
    }

    /** 将 json5 文件转换为标准的 json */
    @action("*.json", "*.json5")
    toStandJson(@routeData data, @serverContext context: ServerContext<ServerContextData>) {
        let jsonFilePath = data["_"] + ".json";
        let json5FilePath = data["_"] + ".json5";

        let filePhysicalPath = context.data.rootDirectory.getFile(jsonFilePath);
        if (filePhysicalPath == null)
            filePhysicalPath = context.data.rootDirectory.getFile(json5FilePath);

        if (fs.existsSync(filePhysicalPath) == false)
            throw errors.fileNotExists(`${jsonFilePath} or ${json5FilePath}`);

        let b: Buffer[] = fs.readFileSync(filePhysicalPath);
        let obj = JSON5.parse(b.toString());
        return JSON.stringify(obj);
    }

}

let defaultConfig: WebsiteConfig = {
    requirejs: {},
    menuItems: []
}

let node_modules = '/node_modules';
let lib = 'lib';
let defaultShim = {
    "react-dom": {
        deps: ["react"]
    }
};
let defaultPaths = {
    css: `${lib}/css`,
    lessjs: `${node_modules}/less/dist/less`,
    less: `${lib}/require-less-0.1.5/less`,
    lessc: `${lib}/require-less-0.1.5/lessc`,
    normalize: `${lib}/require-less-0.1.5/normalize`,

    text: `${node_modules}/maishu-requirejs-plugins/lib/text`,
    json: `${node_modules}/maishu-requirejs-plugins/src/json`,
    noext: `${node_modules}/maishu-requirejs-plugins/src/noext`,

    jquery: `${lib}/jquery-2.1.3`,
    "jquery.event.drag": `${lib}/jquery.event.drag-2.2/jquery.event.drag-2.2`,
    "jquery.event.drag.live": `${lib}/jquery.event.drag-2.2/jquery.event.drag.live-2.2`,

    "js-md5": `${node_modules}/js-md5/src/md5`,

    pin: `${lib}/jquery.pin/jquery.pin.min`,

    "react": `${node_modules}/react/umd/react.development`,
    "react-dom": `${node_modules}/react-dom/umd/react-dom.development`,
    "maishu-chitu": `${node_modules}/maishu-chitu/dist/index.min`,
    "maishu-chitu-admin/static": `${node_modules}/maishu-chitu-admin/dist/static.min`,
    "maishu-chitu-react": `${node_modules}/maishu-chitu-react/dist/index.min`,
    "maishu-chitu-service": `${node_modules}/maishu-chitu-service/dist/index.min`,
    "maishu-dilu": `${node_modules}/maishu-dilu/dist/index.min`,
    "maishu-services-sdk": `${node_modules}/maishu-services-sdk/dist/index`,
    "maishu-image-components": `${node_modules}/maishu-image-components/index`,
    "maishu-toolkit": `${node_modules}/maishu-toolkit/dist/index.min`,
    "maishu-ui-toolkit": `${node_modules}/maishu-ui-toolkit/dist/index.min`,
    "maishu-node-auth": `${node_modules}/maishu-node-auth/dist/client/index`,
    "maishu-wuzhui": `${node_modules}/maishu-wuzhui/dist/index.min`,
    "maishu-wuzhui-helper": `${node_modules}/maishu-wuzhui-helper/dist/index.min`,
    "swiper": `${node_modules}/swiper/dist/js/swiper`,
    "xml2js": `${node_modules}/xml2js/lib/xml2js`,
    "polyfill": `${node_modules}/@babel/polyfill/dist/polyfill`,
    "url-pattern": `${node_modules}/url-pattern/lib/url-pattern`,

    "admin_style_default": "content/admin_style_default.less",
};
