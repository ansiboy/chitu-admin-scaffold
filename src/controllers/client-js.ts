import { controller, action, Controller } from "maishu-node-mvc";
import path = require("path");
import fs = require("fs");
import { errors } from "../errors";
import { Settings, settings } from "../settings";

@controller("/")
export class ClientJSController extends Controller {
    @action("/clientjs_init.js")
    initjs(@settings settings: Settings) {
        let initJS = `define([],function(){
            return {
                default: function(){
                    
                }
            }
        })`;

        if (settings.clientStaticRoot) {
            let initJSPath = path.join(settings.clientStaticRoot, "init.js");
            if (fs.existsSync(initJSPath)) {
                let buffer = fs.readFileSync(initJSPath);
                initJS = buffer.toString();
            }
        }
        return initJS;
    }

    @action("/")
    indexHtml(@settings settings: Settings) {
        let html: string = null;
        if (settings.clientStaticRoot) {
            let indexHtmlPath = path.join(settings.clientStaticRoot, "_index.html");
            if (fs.existsSync(indexHtmlPath)) {
                let buffer = fs.readFileSync(indexHtmlPath);
                html = buffer.toString();
            }
        }

        if (!html) {
            let indexHtmlPath = path.join(settings.innerStaticRoot, "_index.html");
            if (!fs.existsSync(indexHtmlPath))
                throw errors.fileNotExists(indexHtmlPath);

            let buffer = fs.readFileSync(indexHtmlPath);
            html = buffer.toString()
        }

        return this.content(html, "text/html");
    }
}