import webpack, { Configuration, ProgressPlugin, Stats } from "webpack";

import ts from "typescript";

import { LicenseWebpackPlugin } from "license-webpack-plugin";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { readTsConfig } from "@nrwl/workspace";
import _ from "lodash";
import { BuildNodeBuilderOptions } from "./node-types";
import { getNotifierOptions, OUT_FILENAME } from "@apployees-nx/common-build-utils";
import CircularDependencyPlugin from "circular-dependency-plugin";
import path from "path";
import { BuilderContext } from "@angular-devkit/architect";
import ForkTsNotifier from "fork-ts-checker-notifier-webpack-plugin";
import WebpackNotifier from "webpack-notifier";
import { getPluginsForNodeWebpack } from "./node-plugins";
import WebpackBar from "webpackbar";

export function getBaseWebpackPartial(
  options: BuildNodeBuilderOptions,
  context?: BuilderContext
): Configuration {
  const { options: compilerOptions } = readTsConfig(options.tsConfig);
  const supportsEs2015 =
    compilerOptions.target !== ts.ScriptTarget.ES3 &&
    compilerOptions.target !== ts.ScriptTarget.ES5;
  const mainFields = [...(supportsEs2015 ? ["es2015"] : []), "module", "main"];
  const extensions = [".ts", ".tsx", ".mjs", ".js", ".jsx"];
  const notifierOptions = getNotifierOptions(options);

  const isEnvDevelopment = options.dev;
  const isEnvProduction = !isEnvDevelopment;
  const shouldUseSourceMap = options.sourceMap;

  const webpackConfig: Configuration = {
    entry: _.extend({}, {
      main: [options.main]
    }, options.otherEntries),
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? "source-map"
        : false
      : "eval-source-map",
    mode: isEnvDevelopment ? "development" : "production",
    output: {
      path: options.outputPath,
      filename: OUT_FILENAME,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate:
        (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, "/"))
    },
    module: {
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        { parser: { requireEnsure: false } },
        {
          test: /\.(j|t)sx?$/,
          loader: `ts-loader`,
          options: {
            configFile: options.tsConfig,
            transpileOnly: true,
            // https://github.com/TypeStrong/ts-loader/pull/685
            experimentalWatchApi: true,
            compilerOptions: {
              sourceMap: shouldUseSourceMap || !isEnvProduction
            }
          }
        }
      ]
    },
    resolve: {
      extensions,
      alias: getAliases(options),
      plugins: [
        new TsConfigPathsPlugin({
          configFile: options.tsConfig,
          extensions,
          mainFields
        })
      ],
      mainFields
    },
    performance: {
      hints: false
    },
    plugins: getPluginsForNodeWebpack(options, context),
    watch: options.watch,
    watchOptions: {
      poll: options.poll
    },
    stats: getStatsConfig(options)
  };

  const extraPlugins: webpack.Plugin[] = [];

  if (options.progress) {
    extraPlugins.push(new WebpackBar({
      name: "client",
      fancy: isEnvDevelopment,
      basic: !isEnvDevelopment
    }));
  }

  if (isEnvDevelopment && (options.notifier !== false)) {
    extraPlugins.push(new WebpackNotifier({
      title: context ? context.target.project : options.main,
      ...notifierOptions
    }));
    extraPlugins.push(new ForkTsNotifier({
      title: context ? context.target.project : options.main,
      ...notifierOptions,
      skipSuccessful: true // always skip successful for fork otherwise we get duplicate notifications
    }));
  }

  if (options.extractLicenses) {
    extraPlugins.push(
      new LicenseWebpackPlugin({
        pattern: /.*/,
        suppressErrors: true,
        perChunkOutput: false,
        outputFilename: `3rdpartylicenses.txt`
      })
    );
  }

  // process asset entries
  if (options.assets) {
    const copyWebpackPluginPatterns = options.assets.map((asset: any) => {
      return {
        context: asset.input,
        // Now we remove starting slash to make Webpack place it from the output root.
        to: asset.output,
        ignore: asset.ignore,
        from: {
          glob: asset.glob,
          dot: true
        }
      };
    });

    const copyWebpackPluginOptions = {
      ignore: ["**/.DS_Store", "**/Thumbs.db"]
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

function getAliases(options: BuildNodeBuilderOptions): { [key: string]: string } {
  return options.fileReplacements.reduce(
    (aliases, replacement) => ({
      ...aliases,
      [replacement.replace]: replacement.with
    }),
    {}
  );
}

function getStatsConfig(options: BuildNodeBuilderOptions): Stats.ToStringOptions {
  return {
    hash: true,
    timings: false,
    cached: false,
    cachedAssets: false,
    modules: false,
    warnings: true,
    errors: true,
    colors: !options.verbose && !options.statsJson,
    chunks: !options.verbose,
    assets: !!options.verbose,
    chunkOrigins: !!options.verbose,
    chunkModules: !!options.verbose,
    children: !!options.verbose,
    reasons: !!options.verbose,
    version: !!options.verbose,
    errorDetails: !!options.verbose,
    moduleTrace: !!options.verbose,
    usedExports: !!options.verbose
  };
}
