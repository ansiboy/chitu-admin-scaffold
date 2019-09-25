
import * as chitu_react from 'maishu-chitu-react';
import 'text!../content/admin_style_default.less'
import errorHandle from './error-handle';
import UrlPattern = require("url-pattern");
import { Service } from './services/service';

export class Application extends chitu_react.Application {

    // loginInfo: ValueStore<LoginInfo> = PermissionService.loginInfo;

    private modulePathPatterns: { source: UrlPattern, target: UrlPattern }[] = [];
    private service: Service;

    constructor(simpleContainer: HTMLElement, mainContainer: HTMLElement, blankContainer: HTMLElement) {
        super({
            container: {
                simple: simpleContainer,
                default: mainContainer,
                blank: blankContainer,
            },
            modulesPath: ""
        })

        this.service = this.createService(Service);
        this.error.add((sender, error, page) => errorHandle(error, sender, page as chitu_react.Page))
    }

    setModulePath(pathPattern: string, targetPattern: string) {
        this.modulePathPatterns.push({
            source: new UrlPattern(pathPattern),
            target: new UrlPattern(targetPattern)
        });
    }

    protected loadjs(path) {
        let isMatch = false;
        for (let i = 0; i < this.modulePathPatterns.length; i++) {
            let { source, target } = this.modulePathPatterns[i];
            let m = source.match(path);
            if (m != null) {
                path = target.stringify(m);
                isMatch = true;
                break;
            }
        }

        if (isMatch == false) {
            path = "modules/" + path;
        }

        this.service.files().then(files => {
            if (files.indexOf(`${path}.less`) >= 0) {
                requirejs([`less!${path}.less`]);
            }
            if (files.indexOf(`${path}.css`) >= 0) {
                requirejs([`css!${path}.css`]);
            }
        })

        return super.loadjs(path);
    }


}














