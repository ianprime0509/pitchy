import babel from 'rollup-plugin-babel';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'lib/index.js',
      format: 'cjs',
    },
    {
      file: 'lib/index.mjs',
      format: 'es',
    },
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**',
      extensions: ['.ts', '.js'],
    }),
  ],
  external: ['fft.js', 'next-pow-2'],
};
