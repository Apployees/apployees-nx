import { BuildWebserverBuilderOptions } from "../common/webserver-types";
import { getAssetsUrl } from "../common/env";
import {
  cssModuleRegex,
  cssRegex,
  getCSSModuleLocalIdent, lessModuleRegex,
  lessRegex,
  sassModuleRegex,
  sassRegex
} from "../common/common-loaders";

export function getServerLoaders(
  options: BuildWebserverBuilderOptions
) {
  const isEnvDevelopment: boolean = options.dev;
  const isEnvProduction = !isEnvDevelopment;
  const shouldUseSourceMap = options.sourceMap;

  // Webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // In development, we always serve from the root. This makes config easier.
  const publicPath = getAssetsUrl(options);

  // common function to get style loaders
  const getStyleLoaders = (isForModule: boolean, cssOptions?) => {
    cssOptions = isForModule ?
      {
        ...cssOptions,
        localsConvention: "dashesOnly",
        modules: {
          localIdentName: getCSSModuleLocalIdent(isEnvDevelopment)
        }
      } : cssOptions;

    return [
      {
        loader: require.resolve("css-loader"),
        options: {
          ...cssOptions,
          onlyLocals: true
        }
      },
      {
        loader: require.resolve("postcss-loader"),
        options: {
          ident: "postcss",
          plugins: () => [
            require("postcss-flexbugs-fixes"),
            require("postcss-preset-env")({
              autoprefixer: {
                flexbox: "no-2009"
              },
              stage: 3
            })
          ]
        }
      }
    ].filter(Boolean);
  };

  return [
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      loader: require.resolve("url-loader"),
      options: {
        limit: options.imageInlineSizeLimit,
        name: "static/media/[name].[hash:8].[ext]"
      }
    },
    {
      test: cssRegex,
      exclude: cssModuleRegex,
      loader: require.resolve("css-loader")
    },
    {
      test: cssModuleRegex,
      use: getStyleLoaders(true, {
        importLoaders: 1
      })
    },
    {
      test: sassRegex,
      exclude: sassModuleRegex,
      use: getStyleLoaders(false,
        {
          importLoaders: 2
        }
      ).concat(
        {
          loader: require.resolve("resolve-url-loader"),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap
          }
        },
        {
          loader: require.resolve("sass-loader"),
          options: {
            sourceMap: true
          }
        }
      ),
      sideEffects: true
    },
    {
      test: sassModuleRegex,
      use: getStyleLoaders(true,
        {
          importLoaders: 2
        }
      ).concat(
        {
          loader: require.resolve("resolve-url-loader"),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap
          }
        },
        {
          loader: require.resolve("sass-loader"),
          options: {
            sourceMap: true
          }
        }
      )
    },
    {
      test: lessRegex,
      exclude: lessModuleRegex,
      use: getStyleLoaders(false,
        {
          importLoaders: 2
        }
      ).concat(
        {
          loader: require.resolve("resolve-url-loader"),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap
          }
        },
        {
          loader: require.resolve("less-loader"),
          options: {
            sourceMap: true
          }
        }
      ),
      sideEffects: true
    },
    {
      test: lessModuleRegex,
      use: getStyleLoaders(true,
        {
          importLoaders: 2
        }
      ).concat(
        {
          loader: require.resolve("resolve-url-loader"),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap
          }
        },
        {
          loader: require.resolve("less-loader"),
          options: {
            sourceMap: true
          }
        }
      )
    },
    {
      loader: require.resolve("file-loader"),
      exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
      options: {
        name: "static/media/[name].[hash:8].[ext]",
        emitFile: false
      }
    }
  ];
}
