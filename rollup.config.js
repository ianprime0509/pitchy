import babel from 'rollup-plugin-babel';

export default {
  input: 'src/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
  },
  plugins: [
    babel({
      babelrc: false,
      presets: [['env', { modules: false }]],
      plugins: ['external-helpers'],
      exclude: 'node_modules/**',
    }),
  ],
  external: ['fft.js', 'next-pow-2'],
};
