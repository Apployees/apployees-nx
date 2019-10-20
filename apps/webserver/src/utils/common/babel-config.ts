export function createBabelConfig(
  context: string,
  esm: boolean,
  debug: boolean,
  isForDevMode: boolean,
  isForNode: boolean
) {
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          // Allows browserlist file from project to be used.
          configPath: context,
          // Allow importing core-js in entrypoint and use browserlist to select polyfills.
          // This is needed for differential loading as well.
          useBuiltIns: 'entry',
          debug,
          corejs: 3,
          modules: false,
          // Exclude transforms that make all code slower
          exclude: ['transform-typeof-symbol'],
          // Let babel-env figure which modern browsers to support.
          // See: https://github.com/babel/babel/blob/master/packages/babel-preset-env/data/built-in-modules.json
          targets: esm ? { esmodules: true } : undefined
        }
      ],
      [
        require.resolve('@babel/preset-react'),
        {
          useBuiltIns: true
        }
      ],
      [require.resolve('@babel/preset-typescript')]
    ],
    plugins: [
      require.resolve('babel-plugin-macros'),
      // Must use legacy decorators to remain compatible with TypeScript.
      [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
      [
        require.resolve('@babel/plugin-proposal-class-properties'),
        { loose: true }
      ],
      // Add support for styled-components ssr
      require.resolve('babel-plugin-styled-components'),
      // Transform dynamic import to require for server
      isForNode && require.resolve('babel-plugin-dynamic-import-node'),
      [
        require.resolve('babel-plugin-named-asset-import'),
        {
          loaderMap: {
            svg: {
              ReactComponent: '@svgr/webpack?-svgo,+titleProp,+ref![path]',
            },
          },
        },
      ],
    ].filter(Boolean),
    // This is a feature of `babel-loader` for webpack (not Babel itself).
    // It enables caching results in ./node_modules/.cache/babel-loader/
    // directory for faster rebuilds.
    cacheDirectory: true,
    cacheCompression: !isForDevMode,
    compact: !isForDevMode,
  };
}
