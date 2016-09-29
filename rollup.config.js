import npm from "rollup-plugin-node-resolve";
import babel from 'rollup-plugin-babel';

var plugins =[npm({jsnext: true})];
process.argv.forEach(function (val, index, array) {
    if (val.startsWith("-m="))
        plugins.push(babel());
});
export default {
    entry: "index.js",
    plugins: plugins,
    moduleId: "gpv",
    moduleName: "gpv",
    format: "umd"
};
