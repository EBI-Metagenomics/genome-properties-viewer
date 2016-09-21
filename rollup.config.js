import npm from "rollup-plugin-node-resolve";
import babel from 'rollup-plugin-babel';

export default {
    entry: "index.js",
    plugins: [npm({jsnext: true}), babel()],
    moduleId: "gpv",
    moduleName: "gpv",
    format: "umd"
};
