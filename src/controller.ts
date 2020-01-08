import { controller, action, Controller, getLogger, serverContext, ServerContext, VirtualDirectory } from "maishu-node-mvc";
import path = require("path");
import fs = require("fs");
import os = require("os");
import { ServerContextData } from "./settings";
import { WebsiteConfig } from "./static/types";
import { PROJECT_NAME } from "./global";

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

        // if (context.data.staticRoot) {
        //     let initJSPath = path.join(context.data.clientStaticRoot, "init.js");
        //     if (fs.existsSync(initJSPath)) {
        //         let buffer = fs.readFileSync(initJSPath);
        //         initJS = buffer.toString();
        //     }
        // }

        let initJSPath = context.data.staticRoot.getFile("init.js")
        if (initJSPath && fs.existsSync(initJSPath)) {
            let buffer = fs.readFileSync(initJSPath);
            initJS = buffer.toString();
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
    @action("/websiteConfig", "/asset/websiteConfig")
    websiteConfig(@serverContext context: ServerContext<ServerContextData>): WebsiteConfig {
        return HomeController.getWebsiteConfig(context.data)
    }

    static getWebsiteConfig(data: ServerContextData) {
        let config = {} as WebsiteConfig;
        let staticConfigPath = data.rootDirectory.getFile("website-config.js"); //path.join(data.rootDirectory, "website-config.js");
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

        if (data.requirejs) {
            r.requirejs.shim = Object.assign(r.requirejs.shim || {}, data.requirejs.shim || {});
            r.requirejs.paths = Object.assign(r.requirejs.paths, data.requirejs.paths || {});
        }

        return r;
    }


}

let defaultConfig: WebsiteConfig = {
    requirejs: {},
    firstPanelWidth: 130,
    secondPanelWidth: 130,
    menuItems: []
}

let node_modules = '/node_modules'
let lib = '/asset/lib'
let defaultPaths = {
    css: `${lib}/css`,
    lessjs: `${node_modules}/less/dist/less`,
    text: `${lib}/text`,
    json: `${lib}/requirejs-plugins/src/json`,

    jquery: `${lib}/jquery-2.1.3`,
    "jquery.event.drag": `${lib}/jquery.event.drag-2.2/jquery.event.drag-2.2`,
    "jquery.event.drag.live": `${lib}/jquery.event.drag-2.2/jquery.event.drag.live-2.2`,

    "js-md5": `${node_modules}/js-md5/src/md5`,

    pin: `${lib}/jquery.pin/jquery.pin.min`,

    "react": `${node_modules}/react/umd/react.production.min`,
    "react-dom": `${node_modules}/react-dom/umd/react-dom.production.min`,
    "maishu-chitu": `${node_modules}/maishu-chitu/dist/index.min`,
    "maishu-chitu-admin/static": `${node_modules}/maishu-chitu-admin/dist/index.min`,
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

    "admin_style_default": "/asset/content/admin_style_default.less",
    "startup": `/asset/startup`,
};