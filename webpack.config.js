const webpack = require('webpack');
let pkg = require("./package.json");
let license = `
 ${pkg.name} v${pkg.version}
 
 Copyright (c) 2016-2018, shu mai <ansiboy@163.com>
 Licensed under the MIT License.
`;
module.exports = {
    entry: __dirname + "/out/static/index.js", //已多次提及的唯一入口文件
    output: {
        path: __dirname + "/out/static", //打包后的文件存放的地方
        filename: "build.js", //打包后输出文件的文件名
        libraryTarget: 'umd'
    },
    mode: 'development',
    devtool: 'source-map',
    externals: ['react', 'react-dom', 'less',
        'maishu-chitu', 'maishu-chitu-react', 'maishu-dilu',
        'maishu-services-sdk', 'maishu-ui-toolkit',"json!websiteConfig"
    ],
    plugins: [
        new webpack.BannerPlugin(license),
    ],
    module: {
        rules: [{
            test: /\.less$/i,
            use: 'raw-loader',
        }]
    }
}