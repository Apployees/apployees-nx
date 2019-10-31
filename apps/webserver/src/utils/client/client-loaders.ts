import { BuildWebserverBuilderOptions } from '../common/webserver-types';
import { getAssetsUrl } from '../common/env';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import postcssNormalize from 'postcss-normalize';
import {
  cssModuleRegex,
  cssRegex,
  getCSSModuleLocalIdent, lessModuleRegex,
  lessRegex,
  sassModuleRegex,
  sassRegex
} from '../common/common-loaders';
import _ from "lodash";

export function getClientLoaders(
  options: BuildWebserverBuilderOptions) {
  const isEnvDevelopment: boolean = options.dev;
  const isEnvProduction = !isEnvDevelopment;
  const shouldUseSourceMap = options.sourceMap;

  // Webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // In development, we always serve from the root. This makes config easier.
  const publicPath = getAssetsUrl(options);
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  const shouldUseRelativeAssetPaths = publicPath === './';

  // common function to get style loaders
  const getStyleLoaders = (isForModule: boolean, cssOptions?) => {
    cssOptions = isForModule ?
      {
        ...cssOptions,
        localsConvention: 'dashesOnly',
        modules: {
          localIdentName: getCSSModuleLocalIdent(isEnvDevelopment)
        }
      } : cssOptions;

    return [
      isEnvDevelopment && _.isString(require.resolve("style-loader")) ?
        require.resolve("style-loader") : "style-loader",
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: Object.assign(
          {},
          shouldUseRelativeAssetPaths ? { publicPath: '../../' } : undefined
        ),
      },
      {
        loader: _.isString(require.resolve('css-loader')) ?
          require.resolve('css-loader') : 'css-loader',
        options: {
          ...cssOptions,
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: _.isString(require.resolve('postcss-loader')) ?
          require.resolve('postcss-loader') : 'postcss-loader',
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebook/create-react-app/issues/2677
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            }),
            // Adds PostCSS Normalize as the reset css with default options,
            // so that it honors browserslist config in package.json
            // which in turn let's users customize the target behavior as per their needs.
            postcssNormalize(),
          ],
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      },
    ].filter(Boolean);
  };

  return [
    // "url" loader works like "file" loader except that it embeds assets
    // smaller than specified limit in bytes as data URLs to avoid requests.
    // A missing `test` is equivalent to a match.
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      loader: _.isString(require.resolve('url-loader')) ?
        require.resolve('url-loader') : 'url-loader',
      options: {
        limit: options.imageInlineSizeLimit,
        name: 'static/media/[name].[hash:8].[ext]',
      },
    },
    // "postcss" loader applies autoprefixer to our CSS.
    // "css" loader resolves paths in CSS and adds assets as dependencies.
    // "style" loader turns CSS into JS modules that inject <style> tags.
    // In production, we use MiniCSSExtractPlugin to extract that CSS
    // to a file, but in development "style" loader enables hot editing
    // of CSS.
    // By default we support CSS Modules with the extension .module.css
    {
      test: cssRegex,
      exclude: cssModuleRegex,
      use: getStyleLoaders(false, {
        importLoaders: 1,
        sourceMap: isEnvProduction && shouldUseSourceMap,
      }),
      // Don't consider CSS imports dead code even if the
      // containing package claims to have no side effects.
      // Remove this when webpack adds a warning or an error for this.
      // See https://github.com/webpack/webpack/issues/6571
      sideEffects: true,
    },
    // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
    // using the extension .module.css
    {
      test: cssModuleRegex,
      use: getStyleLoaders(true, {
        importLoaders: 1
      }),
    },
    // Opt-in support for SASS (using .scss or .sass extensions).
    // By default we support SASS Modules with the
    // extensions .module.scss or .module.sass
    {
      test: sassRegex,
      exclude: sassModuleRegex,
      use: getStyleLoaders(false,
        {
          importLoaders: 2
        },
      ).concat({
        loader: _.isString(require.resolve('sass-loader')) ?
          require.resolve('sass-loader') : 'sass-loader',
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      }),
      // Don't consider CSS imports dead code even if the
      // containing package claims to have no side effects.
      // Remove this when webpack adds a warning or an error for this.
      // See https://github.com/webpack/webpack/issues/6571
      sideEffects: true,
    },
    // Adds support for CSS Modules, but using SASS
    // using the extension .module.scss or .module.sass
    {
      test: sassModuleRegex,
      use: getStyleLoaders(true,
        {
          importLoaders: 2,
        },
      ).concat({
        loader: _.isString(require.resolve('sass-loader')) ?
          require.resolve('sass-loader') : 'sass-loader',
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      }),
    },
    // Opt-in support for LESS (using .less).
    // By default we support LESS Modules with the
    // extensions .module.LESS
    {
      test: lessRegex,
      exclude: lessModuleRegex,
      use: getStyleLoaders(false,
        {
          importLoaders: 2,
        },
      ).concat({
        loader: _.isString(require.resolve('less-loader')) ?
          require.resolve('less-loader') : 'less-loader',
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap,
          javascriptEnabled: true,
          modifyVars: options.lessStyleVariables_calculated
        },
      }),
      // Don't consider CSS imports dead code even if the
      // containing package claims to have no side effects.
      // Remove this when webpack adds a warning or an error for this.
      // See https://github.com/webpack/webpack/issues/6571
      sideEffects: true,
    },
    // Adds support for CSS Modules, but using less
    // using the extension .module.less
    {
      test: lessModuleRegex,
      use: getStyleLoaders(true,
        {
          importLoaders: 2,
        }
      ).concat({
        loader: _.isString(require.resolve('less-loader')) ?
          require.resolve('less-loader') : 'less-loader',
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap,
          javascriptEnabled: true,
          modifyVars: options.lessStyleVariables_calculated
        },
      }),
    },
    // "file" loader makes sure those assets get served by WebpackDevServer.
    // When you `import` an asset, you get its (virtual) filename.
    // In production, they would get copied to the `build` folder.
    // This loader doesn't use a "test" so it will catch all modules
    // that fall through the other loaders.
    {
      loader: _.isString(require.resolve('file-loader')) ?
        require.resolve('file-loader') : 'file-loader',
      // Exclude `js` files to keep "css" loader working as it injects
      // its runtime that would otherwise be processed through "file" loader.
      // Also exclude `html` and `json` extensions so they get processed
      // by webpacks internal loaders.
      exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
      options: {
        name: 'static/media/[name].[hash:8].[ext]',
      },
    },
  ];
}
