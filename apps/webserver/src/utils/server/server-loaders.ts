import { BuildWebserverBuilderOptions } from '../common/webserver-types';
import { getPublicUrl } from '../common/env';
import {
  cssModuleRegex,
  cssRegex,
  getCSSModuleLocalIdent, lessModuleRegex,
  lessRegex,
  sassModuleRegex,
  sassRegex
} from '../common/common-loaders';

export function getServerLoaders(
  options: BuildWebserverBuilderOptions
) {
  const isEnvDevelopment: boolean = options.dev;
  const isEnvProduction = !isEnvDevelopment;
  const shouldUseSourceMap = options.sourceMap;

  // Webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // In development, we always serve from the root. This makes config easier.
  const publicPath = getPublicUrl(options);
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  const shouldUseRelativeAssetPaths = publicPath === './';

  // common function to get style loaders
  const getStyleLoaders = (cssOptions?) => {
    const loaders = [
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        loader: require.resolve('postcss-loader'),
        options: {
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            }),
          ],
        },
      },
    ].filter(Boolean);
    return loaders;
  };

  return [
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      loader: require.resolve('url-loader'),
      options: {
        limit: options.imageInlineSizeLimit,
        name: 'static/media/[name].[hash:8].[ext]',
      },
    },
    {
      test: cssRegex,
      exclude: cssModuleRegex,
      loader: require.resolve('css-loader'),
    },
    {
      test: cssModuleRegex,
      use: getStyleLoaders({
        importLoaders: 1,
        modules: true,
        getLocalIdent: getCSSModuleLocalIdent,
      }),
    },
    {
      test: sassRegex,
      exclude: sassModuleRegex,
      use: getStyleLoaders(
        {
          importLoaders: 2,
        }
      ).concat(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: {
            sourceMap: true,
          },
        }
      ),
      sideEffects: true,
    },
    {
      test: sassModuleRegex,
      use: getStyleLoaders(
        {
          importLoaders: 2,
          modules: true,
          getLocalIdent: getCSSModuleLocalIdent,
        }
      ).concat(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: {
            sourceMap: true,
          },
        }
      ),
    },
    {
      test: lessRegex,
      exclude: lessModuleRegex,
      use: getStyleLoaders(
        {
          importLoaders: 2,
        }
      ).concat(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
        },
        {
          loader: require.resolve('less-loader'),
          options: {
            sourceMap: true,
          },
        }
      ),
      sideEffects: true,
    },
    {
      test: lessModuleRegex,
      use: getStyleLoaders(
        {
          importLoaders: 2,
          modules: true,
          getLocalIdent: getCSSModuleLocalIdent,
        }
      ).concat(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
        },
        {
          loader: require.resolve('less-loader'),
          options: {
            sourceMap: true,
          },
        }
      ),
    },
    {
      loader: require.resolve('file-loader'),
      exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
      options: {
        name: 'static/media/[name].[hash:8].[ext]',
        emitFile: false,
      },
    },
  ];
}
