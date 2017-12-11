import npm from "rollup-plugin-node-resolve";
import babel from 'rollup-plugin-babel';

export default {
    input: 'index.js',
    sourcemap: true,
    output: {
        file: 'bin/d3.custom.min.js',
        format: 'iife'
    },
    plugins: [
        npm({jsnext: true}),
        babel({
            exclude: 'node_modules/**'
        })
    ],
    name: "gpv"
};
