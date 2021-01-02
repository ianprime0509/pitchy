import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "lib/index.js",
        format: "cjs",
      },
      {
        file: "lib/index.mjs",
        format: "es",
      },
    ],
    plugins: [
      babel({
        babelHelpers: "runtime",
        plugins: ["@babel/plugin-transform-runtime"],
        exclude: "node_modules/**",
        extensions: [".ts", ".js"],
      }),
    ],
    external: ["fft.js", "next-pow-2", /@babel\/runtime/],
  },
  {
    input: "src/index.ts",
    output: [
      {
        file: "umd/index.js",
        format: "umd",
        name: "pitchy",
      },
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: [".ts", ".js"],
      }),
    ],
  },
];
