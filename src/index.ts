import { startServer, VirtualDirectory, getLogger } from 'maishu-node-mvc'
import { errors } from './errors';
import path = require('path')
import fs = require("fs");
import { Settings, ServerContextData } from './settings';
import { registerStation, PROJECT_NAME } from './global';
import { DataHelper, createDatabaseIfNotExists, getConnectionManager, createConnection, ConnectionOptions } from "maishu-node-data";
import { ConnectionConfig } from "mysql";


export { Settings, ServerContextData } from "./settings";
export { WebsiteConfig, PermissionConfig, PermissionConfigItem, SimpleMenuItem, RequireConfig } from "./static/types";
export { StationInfo } from "./global";

export async function start(settings: Settings) {

    if (!settings.rootPhysicalPath)
        throw errors.settingItemNull<Settings>("rootPhysicalPath");

    let rootDirectory: VirtualDirectory;
    let rootPhysicalPaths: string[];
    if (typeof settings.rootPhysicalPath == "string")
        rootPhysicalPaths = [settings.rootPhysicalPath];
    else
        rootPhysicalPaths = settings.rootPhysicalPath;

    for (let i = 0; i < rootPhysicalPaths.length; i++) {
        if (!path.isAbsolute(rootPhysicalPaths[i]))
            throw errors.notAbsolutePath(rootPhysicalPaths[i]);

        if (!fs.existsSync(rootPhysicalPaths[i]))
            throw errors.pathNotExists(rootPhysicalPaths[i]);
    }

    rootDirectory = new VirtualDirectory(__dirname, ...rootPhysicalPaths);

    let staticRootDirectory = rootDirectory.getDirectory("static");
    let controllerDirectory = rootDirectory.getDirectory("controllers");
    staticRootDirectory.addVirtualDirectory("lib", path.join(__dirname, "../lib"), "merge");

    console.assert(staticRootDirectory != null);
    console.assert(controllerDirectory != null);

    let virtualPaths = {};

    virtualPaths = Object.assign(settings.virtualPaths || {}, virtualPaths);

    for (let key in virtualPaths) {
        let physicalPath = virtualPaths[key];
        if (/\.[a-zA-Z]+$/.test(physicalPath)) {    // 如果名称是文件名 *.abc
            staticRootDirectory.addVirtualFile(key, physicalPath)
        }
        else {
            staticRootDirectory.addVirtualDirectory(key, physicalPath, "merge");
        }
    }

    //处理数据库文件
    let childFiles = rootDirectory.getChildFiles();
    let entitiesPhysicalPath = childFiles["entities.js"];
    if (settings.db != null && entitiesPhysicalPath != null) {
        let connectionManager = getConnectionManager();

        await createDatabaseIfNotExists(settings.db);
        if (!connectionManager.has(settings.db.database)) {
            let entities = [entitiesPhysicalPath];
            let dbOptions = Object.assign({
                type: "mysql", synchronize: true, logging: false,
                connectTimeout: 3000, entities, name: settings.db.database,
                username: settings.db.user, password: settings.db.password
            } as ConnectionOptions, settings.db);
            let conn = await createConnection(dbOptions);
            let mod = require(entitiesPhysicalPath);
            if (typeof mod.default == "function") {
                mod.default(conn);
            }

        }
    }


    let serverContextData: ServerContextData = {
        staticRoot: staticRootDirectory,
        rootDirectory: rootDirectory,
        station: settings.station,
        requirejs: settings.requirejs,
    };

    serverContextData = Object.assign(settings.serverContextData || {}, serverContextData);
    // await createDatabase(settings, rootDirectory);

    startServer({
        port: settings.port,
        staticDirectory: staticRootDirectory,
        controllerDirectory,
        proxy: settings.proxy,
        bindIP: settings.bindIP,
        headers: settings.headers,
        serverContextData: serverContextData
    });

    if (settings.station != null) {
        registerStation(serverContextData, settings);
    }

    return { rootDirectory }
}

async function createDataConnection(connConfig: ConnectionConfig, entitiesPath: string) {
    let connectionManager = getConnectionManager();
    if (connectionManager.has(connConfig.database) == false) {
        let entities: string[] = [entitiesPath];
        let dbOptions: ConnectionOptions = {
            type: "mysql",
            host: connConfig.host,
            port: connConfig.port,
            username: connConfig.user,
            password: connConfig.password,
            database: connConfig.database,
            synchronize: true,
            logging: false,
            connectTimeout: 3000,
            entities,
            name: connConfig.database
        }

        await createConnection(dbOptions);
    }

}




