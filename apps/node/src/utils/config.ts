import webpack, { Configuration, ProgressPlugin, Stats } from "webpack";

import ts from "typescript";

import { readTsConfig } from "@nrwl/workspace";
import _ from "lodash";
import { BuildNodeBuilderOptions } from "./node-types";
import { getNotifierOptions, OUT_FILENAME } from "@apployees-nx/common-build-utils";
import path from "path";
import { BuilderContext } from "@angular-devkit/architect";
import { getPluginsForNodeWebpack } from "./node-plugins";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import PnpWebpackPlugin from "pnp-webpack-plugin";

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
