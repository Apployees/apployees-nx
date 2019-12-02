/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import webpack, { Configuration } from "webpack";
import path, { dirname } from "path";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import TerserWebpackPlugin from "terser-webpack-plugin";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { getOutputHashFormat } from "../common/hash-format";
import { IBuildWebserverBuilderOptions } from "../common/webserver-types";
import _ from "lodash";
import { BuilderContext } from "@angular-devkit/architect";
import { getBaseLoaders } from "../common/common-loaders";
import { getAssetsUrl, getWebserverEnvironmentVariables } from "../common/env";
import { getClientLoaders } from "./client-loaders";
import { getPlugins } from "../common/plugins";
import { extensions, FILENAMES, getAliases, getStatsConfig } from "../common/common-config";
import CircularDependencyPlugin from "circular-dependency-plugin";
import isWsl from "is-wsl";
import OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import safePostCssParser from "postcss-safe-parser";
import PnpWebpackPlugin from "pnp-webpack-plugin";
import ManifestPlugin from "webpack-manifest-plugin";
import InlineChunkHtmlPlugin from "react-dev-utils/InlineChunkHtmlPlugin";
import InterpolateHtmlPlugin from "react-dev-utils/InterpolateHtmlPlugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import FaviconsWebpackPlugin from "favicons-webpack-plugin-ex";
import HtmlWebpackInjector from "html-webpack-injector";
import { readJsonFile } from "@nrwl/workspace";
import WorkerPlugin from "worker-plugin";
import WorkboxWebpackPlugin from "workbox-webpack-plugin";
import "worker-loader";
import { IProcessedEnvironmentVariables } from "@apployees-nx/common-build-utils";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import WebpackBar from "webpackbar";

export function getClientConfig(
  options: IBuildWebserverBuilderOptions,
  context: BuilderContext,
  esm?: boolean,
): Configuration {
  const isEnvDevelopment = options.dev;
  const isEnvProduction = !options.dev;
  const isScriptOptimizeOn = isEnvProduction;

  const mainFields = [...(esm ? ["es2015"] : []), "module", "main"];
  const hashFormat = getOutputHashFormat(options.outputHashing);
  const suffixFormat = esm ? ".esm" : ".es5";
  const filename = isScriptOptimizeOn
    ? `static/js/[name]${hashFormat.script}${suffixFormat}.js`
    : "static/js/[name].js";
  const chunkFilename = isScriptOptimizeOn
    ? `static/js/[name]${hashFormat.chunk}${suffixFormat}.js`
    : "static/js/[name].js";

  const shouldUseSourceMap = isEnvDevelopment; // clients never have source maps in production code

  const webserverEnvironmentVariables = getWebserverEnvironmentVariables(options, context, true);

  const publicPath = getAssetsUrl(options);

  const otherEntries = options.clientOtherEntries || {};
  if (otherEntries["main"]) {
    throw new Error(
      `clientOtherEntries cannot have an entry with key 'main' (currently set to '${otherEntries["main"]}').`,
    );
  }

  otherEntries["main"] = options.clientMain;

  const entries = Object.keys(otherEntries).reduce((acc, key) => {
    acc[key] = [
      isEnvDevelopment &&
        key === "main" &&
        `@apployees-nx/webserver/utils/client/webpackHotDevClient?devPort=${options.devWebpackPort}`,
      otherEntries[key],
    ].filter(Boolean);

    return acc;
  }, {});

  const webpackConfig: Configuration = {
    name: "client",
    target: "web",
    mode: isEnvProduction ? "production" : "development",
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: shouldUseSourceMap ? "eval-source-map" : false,
    entry: entries,
    output: {
      // The build folder.
      path: options.publicOutputFolder_calculated,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,
      filename,
      // TODO: remove this when upgrading to webpack 5
      futureEmitAssets: false,
      chunkFilename,
      // We use "/" in development, can be configured in production
      publicPath: publicPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? info =>
            path.relative(path.resolve(options.root, options.sourceRoot), info.absoluteResourcePath).replace(/\\/g, "/")
        : isEnvDevelopment && (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, "/")),
      // Prevents conflicts when multiple Webpack runtimes (from different apps)
      // are used on the same page.
      jsonpFunction: `webpackJsonp${context.target.project}`,
    },
    optimization: {
      minimize: isEnvProduction,
      minimizer: isScriptOptimizeOn
        ? [createTerserPlugin(shouldUseSourceMap), createOptimizeCssAssetsPlugin(shouldUseSourceMap)]
        : [],
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks: "all",
        name: false,
      },
      runtimeChunk: true,

      // see https://github.com/webpack/webpack/issues/7128
      namedModules: false,
    },
    resolve: {
      extensions,
      alias: getAliases(options.clientFileReplacements),
      plugins: [
        new TsConfigPathsPlugin({
          configFile: options.tsConfig,
          extensions,
          mainFields,
        }),
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
      ],
      mainFields,
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        ...getBaseLoaders(
          options,
          dirname(options.clientMain),
          esm,
          options.verbose,
          isEnvDevelopment,
          false, // isEnvServer
        ),
        {
          test: /\.worker\.js$/,
          use: { loader: "worker-loader" },
        },
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: getClientLoaders(options),
        },
      ],
    },

    plugins: [
      ...getPlugins(options, context, true),
      // Generates an `app.html` file with the <script> injected.
      new HtmlWebpackPlugin(
        Object.assign(
          {},
          {
            inject: true,
            filename: FILENAMES.appHtml,
            template: options.appHtml,
          },
          isEnvProduction
            ? {
                minify: {
                  removeComments: true,
                  collapseWhitespace: true,
                  removeRedundantAttributes: true,
                  useShortDoctype: true,
                  removeEmptyAttributes: true,
                  removeStyleLinkTypeAttributes: true,
                  keepClosingSlash: true,
                  minifyJS: true,
                  minifyCSS: true,
                  minifyURLs: true,
                },
              }
            : undefined,
        ),
      ),

      isEnvProduction &&
        options.favicon &&
        new FaviconsWebpackPlugin({
          logo: options.favicon,
          cache: true,
          outputPath: "static/favicons/",
          prefix: "static/favicons/",
          excludeManifestInjection: true,
        }),

      new HtmlWebpackInjector(),
      // Inlines the webpack runtime script. This script is too small to warrant
      // a network request.
      isEnvProduction &&
        options.inlineRuntimeChunk &&
        new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
      // Makes some environment variables available in index.html.
      // The public URL is available as %ASSETS_URL% in index.html, e.g.:
      // <link rel="shortcut icon" href="%ASSETS_URL%favicon.ico">
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, webserverEnvironmentVariables.raw),

      // add support for web workers.
      new WorkerPlugin({
        globalObject: "self",
      }),

      // add support for service workers
      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the Webpack build.
      isEnvProduction &&
        new WorkboxWebpackPlugin.GenerateSW({
          clientsClaim: true,
          exclude: [/\.map$/, /asset-manifest\.json$/],
          importWorkboxFrom: "cdn",
          navigateFallback: publicPath + FILENAMES.appHtml,
          navigateFallbackBlacklist: [
            // Exclude URLs starting with /_, as they're likely an API call
            new RegExp("^/_"),
            // Exclude any URLs whose last part seems to be a file extension
            // as they're likely a resource and not a SPA route.
            // URLs containing a "?" character won't be blacklisted as they're likely
            // a route with query params (e.g. auth callbacks).
            new RegExp("/[^/?]+\\.[^/]+$"),
          ],
        }),

      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: FILENAMES.manifestJson,
        publicPath: publicPath,
        generate: (seed, files) => {
          return generateManifestContents(publicPath, files, seed, options, webserverEnvironmentVariables);
        },
      }),
    ].filter(Boolean),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      module: "empty",
      dgram: "empty",
      dns: "mock",
      fs: "empty",
      net: "empty",
      tls: "empty",
      // eslint-disable-next-line @typescript-eslint/camelcase
      child_process: "empty",
    },
    stats: getStatsConfig(options),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  };

  const extraPlugins: webpack.Plugin[] = [];

  if (options.progress) {
    extraPlugins.push(
      new WebpackBar({
        name: "client",
        fancy: isEnvDevelopment,
        basic: !isEnvDevelopment,
      }),
    );
  }

  if (options.extractLicenses) {
    extraPlugins.push(
      new LicenseWebpackPlugin({
        pattern: /.*/,
        suppressErrors: true,
        perChunkOutput: false,
        outputFilename: FILENAMES.thirdPartyLicenses,
      }),
    );
  }

  if (options.showCircularDependencies) {
    extraPlugins.push(
      new CircularDependencyPlugin({
        // eslint-disable-next-line no-useless-escape
        exclude: /[\\\/]node_modules[\\\/]/,
      }),
    );
  }

  if (isEnvDevelopment && options.devClientBundleAnalyzer) {
    extraPlugins.push(new BundleAnalyzerPlugin());
  }

  webpackConfig.plugins = [...webpackConfig.plugins, ...extraPlugins];

  return webpackConfig;
}

export function createOptimizeCssAssetsPlugin(shouldUseSourceMap: boolean) {
  return new OptimizeCSSAssetsPlugin({
    cssProcessorOptions: {
      parser: safePostCssParser,
      map: shouldUseSourceMap
        ? {
            // `inline: false` forces the sourcemap to be output into a
            // separate file
            inline: false,
            // `annotation: true` appends the sourceMappingURL to the end of
            // the css file, helping the browser find the sourcemap
            annotation: true,
          }
        : false,
    },
  });
}

export function createTerserPlugin(shouldUseSourceMap: boolean) {
  return new TerserWebpackPlugin({
    terserOptions: {
      parse: {
        // We want terser to parse ecma 8 code. However, we don't want it
        // to apply any minification steps that turns valid ecma 5 code
        // into invalid ecma 5 code. This is why the 'compress' and 'output'
        // sections only apply transformations that are ecma 5 safe
        // https://github.com/facebook/create-react-app/pull/4234
        ecma: 8,
      },
      compress: {
        ecma: 5,
        warnings: false,
        // Disabled because of an issue with Uglify breaking seemingly valid code:
        // https://github.com/facebook/create-react-app/issues/2376
        // Pending further investigation:
        // https://github.com/mishoo/UglifyJS2/issues/2011
        comparisons: false,
        // Disabled because of an issue with Terser breaking valid code:
        // https://github.com/facebook/create-react-app/issues/5250
        // Pending further investigation:
        // https://github.com/terser-js/terser/issues/120
        inline: 2,
      },
      mangle: {
        safari10: true,
      },
      output: {
        ecma: 5,
        comments: false,
        // Turned on because emoji and regex is not minified properly using default
        // https://github.com/facebook/create-react-app/issues/2488
        // eslint-disable-next-line @typescript-eslint/camelcase
        ascii_only: true,
      },
    },
    // Use multi-process parallel running to improve the build speed
    // Default number of concurrent runs: os.cpus().length - 1
    // Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
    // https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
    parallel: !isWsl,
    // Enable file caching
    cache: true,
    sourceMap: shouldUseSourceMap,
  });
}

/**
 * We need to take all the icons from FaviconsWebpackPlugin and inject
 * them into the manifest file. Even though there is already a manifest.json
 * created by FaviconsWebpackPlugin, the problem is that it is in a completely
 * different folder and is separate. We just want the icons from that file.
 * Unfortunately, at this point, that file is not saved so we can't just load it
 * here. Thus, we will search for all the relevant icons ourselves and then
 * inject them into the manifest.
 *
 * @param publicPath
 * @param files
 * @param seed
 * @param options
 */
function generateManifestContents(
  publicPath,
  files,
  seed,
  options: IBuildWebserverBuilderOptions,
  envVars: IProcessedEnvironmentVariables,
) {
  const icons: any = [];
  const iconToSearch = publicPath + "static/favicons/android-chrome";

  const manifestFiles = files.reduce(function(manifest, file) {
    // skip the manifests generated by favicon plugin
    if (file.name.startsWith("static/favicons/manifest")) {
      return manifest;
    }

    manifest[file.name] = file.path;

    if (file.path.indexOf(iconToSearch) >= 0) {
      icons.push({
        src: file.path,
        sizes: file.path.substring(iconToSearch.length + 1, file.path.indexOf(".png")),
        type: "image/png",
      });
    }

    return manifest;
  }, seed);

  let suppliedManifest: any = { icons: icons };
  if (options.manifestJson) {
    suppliedManifest = _.merge(suppliedManifest, readJsonFile(options.manifestJson));
  }

  if (!suppliedManifest.start_url && envVars.raw["PUBLIC_URL"]) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    suppliedManifest.start_url = envVars.raw["PUBLIC_URL"];
  }

  return _.merge(suppliedManifest, {
    files: manifestFiles,
  });
}
