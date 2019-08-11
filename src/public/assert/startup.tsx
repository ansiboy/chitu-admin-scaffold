import { Application, app } from "./application";
import ReactDOM = require("react-dom");
import { SimpleMasterPage } from "./masters/simple-master-page";
import { MainMasterPage } from "./masters/main-master-page";
import React = require("react");
import { MasterPage } from "./masters/master-page";
import settings = require('auth/settings');
import { config } from "../config";
import { errors } from "./errors";

export default function startup() {
    async function createMasterPages(app: Application) {
        return new Promise<{ simple: HTMLElement, main: HTMLElement }>((resolve, reject) => {
            let container = document.createElement('div')

            ReactDOM.render(<SimpleMasterPage app={app} ref={e => masterPages.simple = e || masterPages.simple} />, document.getElementById('simple-master'))
            ReactDOM.render(<MainMasterPage app={app} ref={e => masterPages.default = e || masterPages.default} />, document.getElementById('main-master'))
            document.body.appendChild(container)
        })
    }

    let masterPages = {
        simple: null as MasterPage<any>,
        default: null as MainMasterPage
    }

    createMasterPages(app);
    loadStyle();

    // app.masterPages = masterPages;

    requirejs(["clientjs_init.js"], function (initModule) {
        console.assert(masterPages.default != null);
        if (initModule && typeof initModule.default == 'function') {
            let args: InitArguments = { app, mainMaster: masterPages.default }
            initModule.default(args)
        }

        app.run();
    })
}

/** 加载样式文件 */
function loadStyle() {
    let str: string = require('text!../content/admin_style_default.less')
    if (config.firstPanelWidth) {
        str = str + `\r\n@firstPanelWidth: ${config.firstPanelWidth}px;`
    }

    if (config.secondPanelWidth) {
        str = str + `\r\n@secondPanelWidth: ${config.secondPanelWidth}px;`
    }

    let less = (window as any)['less']
    less.render(str, function (e: Error, result: { css: string }) {
        if (e) {
            console.error(e)
            return
        }

        let style = document.createElement('style')
        document.head.appendChild(style)
        style.innerText = result.css
    })
}

export type InitArguments = {
    app: Application,
    mainMaster: MainMasterPage,
}


