import npm from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";

export default {
  onwarn ( message ) {
    if (message.code === 'CIRCULAR_DEPENDENCY') {
      return;
    }
    console.error(message);
  },
  input: "index.js",
  output: {
    file: "bin/d3.custom.min.js",
    format: "iife",
    sourcemap: true,
    name: "gpv"
  },
  plugins: [
    npm({
      jsnext: true
    }),
    babel({
      exclude: "node_modules/**"
    })
  ]
};
