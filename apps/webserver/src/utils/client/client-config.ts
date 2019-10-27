import webpack from "webpack";
import { Configuration, ProgressPlugin } from "webpack";
import path from "path";
import { dirname } from "path";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import TerserWebpackPlugin from "terser-webpack-plugin";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { getOutputHashFormat } from "../common/hash-format";
import { BuildWebserverBuilderOptions } from "../common/webserver-types";
import _ from "lodash";
import { BuilderContext } from "@angular-devkit/architect";
import { getBaseLoaders } from "../common/common-loaders";
import { getWebserverEnvironmentVariables, getAssetsUrl } from "../common/env";
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

export function getClientConfig(
  options: BuildWebserverBuilderOptions,
  context: BuilderContext,
  esm?: boolean
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

  const shouldUseSourceMap = options.sourceMap;

  const webserverEnvironmentVariables = getWebserverEnvironmentVariables(options, context, true);

  const publicPath = getAssetsUrl(options);

  const otherEntries = options.clientOtherEntries || {};
  if (otherEntries["main"]) {
    throw new Error(`clientOtherEntries cannot have an entry with key 'main' (currently set to '${otherEntries["main"]}').`);
  }

  otherEntries["main"] = options.clientMain;

  const entries = Object.keys(otherEntries).reduce((acc, key) => {
    acc[key] = [
      isEnvDevelopment && key === "main" && `react-ssr-dev-utils/webpackHotDevClient?devPort=${options.devWebpackPort}`,
      otherEntries[key]
    ].filter(Boolean);

    return acc;
  }, {});

  const webpackConfig: Configuration = {
    name: "client",
    target: "web",
    mode: isEnvProduction ? "production" : "development",
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? "source-map"
        : false
      : "eval-source-map",
    entry: entries,
    // externals: getNodeExternals(
    //   options.clientExternalLibraries,
    //   options.clientExternalDependencies
    // ),
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
          path
            .relative(path.resolve(options.root, options.sourceRoot), info.absoluteResourcePath)
            .replace(/\\/g, "/")
        : isEnvDevelopment &&
        (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, "/")),
      // Prevents conflicts when multiple Webpack runtimes (from different apps)
      // are used on the same page.
      jsonpFunction: `webpackJsonp${context.target.project}`
    },
    optimization: {
      minimize: isEnvProduction,
      minimizer: isScriptOptimizeOn ? [
        createTerserPlugin(shouldUseSourceMap),
        createOptimizeCssAssetsPlugin(shouldUseSourceMap)
      ] : [],
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks: "all",
        name: false
      },
      runtimeChunk: true,

      // see https://github.com/webpack/webpack/issues/7128
      namedModules: false
    },
    resolve: {
      extensions,
      alias: getAliases(options.clientFileReplacements),
      plugins: [
        new TsConfigPathsPlugin({
          configFile: options.tsConfig,
          extensions,
          mainFields
        }),
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin
      ],
      mainFields
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module)
      ]
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
          false // isEnvServer
        ),
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: getClientLoaders(options)
        }
      ]
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
            template: options.appHtml
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
                minifyURLs: true
              }
            }
            : undefined
        )
      ),
      // Inlines the webpack runtime script. This script is too small to warrant
      // a network request.
      isEnvProduction &&
      options.inlineRuntimeChunk &&
      new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
      // Makes some environment variables available in index.html.
      // The public URL is available as %ASSETS_URL% in index.html, e.g.:
      // <link rel="shortcut icon" href="%ASSETS_URL%/favicon.ico">
      new InterpolateHtmlPlugin(HtmlWebpackPlugin,
        webserverEnvironmentVariables.raw),
      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: FILENAMES.manifestJson,
        publicPath: publicPath,
        generate: (seed, files) => {
          const manifestFiles = files.reduce(function(manifest, file) {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);

          return {
            files: manifestFiles
          };
        }
      })
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
      child_process: "empty"
    },
    stats: getStatsConfig(options),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false
  };

  const extraPlugins: webpack.Plugin[] = [];

  if (options.progress && isEnvDevelopment) {
    extraPlugins.push(new ProgressPlugin());
  }

  if (options.extractLicenses) {
    extraPlugins.push(
      new LicenseWebpackPlugin({
        pattern: /.*/,
        suppressErrors: true,
        perChunkOutput: false,
        outputFilename: FILENAMES.thirdPartyLicenses
      })
    );
  }

  // process asset entries
  if (options.assets) {
    const copyWebpackPluginPatterns = options.assets.map((asset: any) => {
      return {
        context: asset.input,
        to: "", // blank because this entire webpack config outputs to public
        ignore: asset.ignore,
        from: {
          glob: asset.glob,
          dot: true
        }
      };
    });

    const copyWebpackPluginOptions = {
      ignore: [
        ".gitkeep", "**/.DS_Store", "**/Thumbs.db",
        // don't overwrite the files we generated ourselves.
        ..._.map(_.values(FILENAMES), filename =>
          path.resolve(options.root, options.sourceRoot, FILENAMES.publicFolder, filename))]
    };

    const copyWebpackPluginInstance = new CopyWebpackPlugin(
      copyWebpackPluginPatterns,
      copyWebpackPluginOptions
    );
    extraPlugins.push(copyWebpackPluginInstance);
  }

  if (options.showCircularDependencies) {
    extraPlugins.push(
      new CircularDependencyPlugin({
        exclude: /[\\\/]node_modules[\\\/]/
      })
    );
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
          annotation: true
        }
        : false
    }
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
        ecma: 8
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
        inline: 2
      },
      mangle: {
        safari10: true
      },
      output: {
        ecma: 5,
        comments: false,
        // Turned on because emoji and regex is not minified properly using default
        // https://github.com/facebook/create-react-app/issues/2488
        ascii_only: true
      }
    },
    // Use multi-process parallel running to improve the build speed
    // Default number of concurrent runs: os.cpus().length - 1
    // Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
    // https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
    parallel: !isWsl,
    // Enable file caching
    cache: true,
    sourceMap: shouldUseSourceMap
  });
}

