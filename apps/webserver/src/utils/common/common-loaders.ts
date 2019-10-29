import { BuildWebserverBuilderOptions } from "./webserver-types";

// style files regexes
export const cssRegex = /\.css$/;
export const cssModuleRegex = /\.module\.css$/;
export const sassRegex = /\.(scss|sass)$/;
export const sassModuleRegex = /\.module\.(scss|sass)$/;
export const lessRegex = /\.less$/;
export const lessModuleRegex = /\.module\.less$/;

export function getBaseLoaders(
  options: BuildWebserverBuilderOptions,
  context: string,
  esm: boolean,
  debug: boolean,
  isEnvDevelopment: boolean,
  isEnvServer: boolean) {
  const isEnvProduction = !isEnvDevelopment;

  return [
    // Disable require.ensure as it's not a standard language feature.
    { parser: { requireEnsure: false } },
    {
      test: /\.([jt])sx?$/,
      loader: `babel-loader`,
      exclude: /node_modules/,
      options: {
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
          isEnvServer && require.resolve('babel-plugin-dynamic-import-node'),
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
          !isEnvServer && ["import", { libraryName: "antd", libraryDirectory: "lib", style: true}, "ant"],
          !isEnvServer && ["import", { libraryName: "antd-mobile", libraryDirectory: "lib", style: true}, "antd-mobile"],
        ].filter(Boolean),
        // This is a feature of `babel-loader` for webpack (not Babel itself).
        // It enables caching results in ./node_modules/.cache/babel-loader/
        // directory for faster rebuilds.
        cacheDirectory: true,
        cacheCompression: isEnvProduction,
        compact: isEnvProduction,
      }
    }
  ];
}

export function getCSSModuleLocalIdent(
  isEnvDevelopment: boolean
): string {
  return isEnvDevelopment ? '[path][name]__[local]' : '[hash:base64]';
}
