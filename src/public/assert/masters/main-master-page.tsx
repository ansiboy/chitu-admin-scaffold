import React = require('react');
import { Application } from '../application';
import { MasterPage, MasterPageProps } from './master-page';
import { masterPageNames } from './names';
import { ValueStore } from 'maishu-chitu';
import { Resource } from 'assert/models';

export type MenuItem = Resource & {
    icon?: string, parent: MenuItem, children: MenuItem[],
}

export type SimpleMenuItem = {
    name: string, path?: string, icon?: string,
    children?: SimpleMenuItem[]
}

interface State {
    currentPageName?: string,
    toolbar?: JSX.Element,
    menuItems: MenuItem[],
    resourceId?: string,
    /** 不显示菜单的页面 */
    hideMenuPages?: string[],
    username?: string,
    roleName?: string,
}

export class MainMasterPage extends MasterPage<State> {

    name = masterPageNames.main

    pageContainer: HTMLElement;
    element: HTMLElement;
    private app: Application;
    private menuResources = new ValueStore<Resource[]>([]);

    constructor(props: MasterPageProps) {
        super(props);

        // let username = Service.loginInfo.value ? Service.loginInfo.value.username : "";
        this.state = { menuItems: [], username: "" }

        this.app = props.app;
        // this.ps = this.app.createService(PermissionService);
        this.menuResources.add((value) => {
            let menuItems = translateToMenuItems(value).filter(o => o.parent == null);
            this.setState({ menuItems: menuItems })
        })
    }

    private showPageByNode(node: MenuItem) {
        let children = node.children || []
        if (!node.page_path && (node.children || []).length > 0) {
            this.showPageByNode(children[0])
            return
        }
        let pagePath = node.page_path;
        if (pagePath == null && children.length > 0) {
            node = children[0];
            pagePath = node.page_path;
        }

        if (!pagePath) {
            console.log(`MenuItem ${node.name} page name is empty.`);
            return;
        }

        if (pagePath.startsWith("#")) {
            pagePath = pagePath.substr(1);
            this.app.redirect(pagePath, { resourceId: node.id });
            return;
        }

        this.app.redirect("outer-page", { target: pagePath, resourceId: node.id });
    }

    private findMenuItemByResourceId(menuItems: MenuItem[], resourceId: string) {
        let stack = new Array<MenuItem>()
        stack.push(...menuItems)
        while (stack.length > 0) {
            let item = stack.pop()
            if (item == null)
                return

            if (item.id == resourceId)
                return item

            let children = item.children || []
            stack.push(...children)
        }

        return null
    }

    private findMenuItemByPageName(menuItems: MenuItem[], pageName: string) {
        let stack = new Array<MenuItem>()
        stack.push(...menuItems)
        while (stack.length > 0) {
            let item = stack.pop()
            if (item == null)
                throw new Error("item is null")

            if (item.page_path) {
                let obj = this.app.parseUrl(item.page_path) || { pageName: '' }
                if (obj.pageName == pageName)
                    return item
            }

            let children = item.children || []
            stack.push(...children)
        }

        return null
    }

    private textToGuid(name: string) {
        const storageName = "nameToGuid";
        let nameToGuid = localStorage.getItem(storageName) || "{}";
        let data = JSON.parse(nameToGuid);
        let id = data[name];
        if (!id) {
            id = guid();
            data[name] = id;
            localStorage.setItem(storageName, JSON.stringify(data));
        }

        return id;
    }

    private translateToResource(o: SimpleMenuItem): Resource {
        return {
            id: this.textToGuid(o.name + o.path || ""), name: o.name, page_path: o.path, type: "menu",
            icon: o.icon, parent_id: o["parent_id"]
        } as Resource
    }

    setMenu(...menuItems: SimpleMenuItem[]) {

        let resources: Resource[] = [];

        let stack = new Array<SimpleMenuItem>();
        stack.push(...menuItems);
        while (stack.length > 0) {
            let item = stack.shift();

            let resource = this.translateToResource(item);
            resources.push(resource);

            item.children = item.children || [];
            item.children.forEach(c => c["parent_id"] = resource.id);
            stack.push(...(item.children || []));
        }

        this.menuResources.value = resources;
    }

    setToolbar(value: JSX.Element) {
        this.setState({ toolbar: value })
    }

    get menuItems(): MenuItem[] {
        return this.state.menuItems || [];
    }

    componentDidMount() {
        this.app.pageCreated.add((sender, page) => {
            page.shown.add(() => {
                this.setState({ currentPageName: page.name })
                this.setState({ resourceId: (page.data.resourceId || page.data.resource_id) as string })
            })
        })
    }

    render() {
        let { menuItems: menuData } = this.state;
        let currentPageName: string = this.state.currentPageName || '';

        let firstLevelNodes = menuData.filter(o => o.type == "menu");
        let currentNode: MenuItem | null | undefined
        if (this.state.resourceId) {
            currentNode = this.findMenuItemByResourceId(firstLevelNodes, this.state.resourceId)
        }
        else if (currentPageName) {
            currentNode = this.findMenuItemByPageName(firstLevelNodes, currentPageName)
        }
        let firstLevelNode: MenuItem | null = null;
        let secondLevelNode: MenuItem;

        if (currentNode != null) {
            if (currentNode.parent == null) {
                firstLevelNode = currentNode
            }
            else if (currentNode.parent.parent == null) {   //二级菜单
                firstLevelNode = currentNode.parent
                secondLevelNode = currentNode
            }
            else if (currentNode.parent.parent.parent == null) {   //三级菜单
                firstLevelNode = currentNode.parent.parent
                secondLevelNode = currentNode.parent
            }
        }

        let nodeClassName = '';
        let hideMenuPages = this.state.hideMenuPages || []
        if (hideMenuPages.indexOf(currentPageName) >= 0) {
            nodeClassName = 'hideFirst';
        }
        else if (firstLevelNode == null || (firstLevelNode.children || []).filter(o => o.type == "menu").length == 0) {
            nodeClassName = 'hideSecond';
        }

        return <div className={`${nodeClassName}`} ref={e => this.element = e || this.element}>
            <div className="first">
                <ul className="list-group">
                    {firstLevelNodes.map((o, i) =>
                        <li key={i} className={o == firstLevelNode ? "list-group-item active" : "list-group-item"}
                            style={{ cursor: 'pointer', display: o.type != "menu" ? "none" : '' }}
                            onClick={() => this.showPageByNode(o)}>
                            <i className={o.icon}></i>
                            <span>{o.name}</span>
                        </li>
                    )}
                </ul>
            </div>
            <div className="second">
                <ul className="list-group">
                    {(firstLevelNode ? (firstLevelNode.children || []) : []).filter(o => o.type == "menu").map((o, i) =>
                        <li key={i} className={o == secondLevelNode ? "list-group-item active" : "list-group-item"}
                            style={{ cursor: 'pointer', display: o.type != "menu" ? "none" : '' }}
                            onClick={() => this.showPageByNode(o)}>
                            <i className={o.icon}></i>
                            <span>{o.name}</span>
                        </li>
                    )}
                </ul>
            </div>
            <div className="main">
                <nav className="navbar navbar-default">
                    {this.state.toolbar}
                </nav>
                <div className={`page-container page-placeholder`}
                    ref={(e: HTMLElement) => this.pageContainer = e || this.pageContainer}>
                </div>
            </div>
        </div >

    }
}




function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function translateToMenuItems(resources: Resource[]): MenuItem[] {
    let arr = new Array<MenuItem>();
    let stack: MenuItem[] = [...resources.filter(o => o.parent_id == null).reverse() as MenuItem[]];
    while (stack.length > 0) {
        let item = stack.pop();
        item.children = resources.filter(o => o.parent_id == item.id) as MenuItem[];
        if (item.parent_id) {
            item.parent = resources.filter(o => o.id == item.parent_id)[0] as MenuItem;
        }

        stack.push(...item.children.reverse());

        arr.push(item);
    }

    let ids = arr.map(o => o.id);
    for (let i = 0; i < ids.length; i++) {
        let item = arr.filter(o => o.id == ids[i])[0];
        console.assert(item != null);

        if (item.children.length > 1) {
            item.children.sort((a, b) => a.sort_number < b.sort_number ? -1 : 1);
        }
    }

    return arr;
}