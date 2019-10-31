import { BuildNodeBuilderOptions } from "./node-types";
import { BuilderContext } from "@angular-devkit/architect";
import {
  getNotifierOptions,
  getProcessedEnvironmentVariables,
  loadEnvironmentVariables
} from "@apployees-nx/common-build-utils";
import webpack from "webpack";
import ForkTsCheckerWebpackPlugin from "react-dev-utils/ForkTsCheckerWebpackPlugin";
import resolve from "resolve";
import findup from "findup-sync";
import typescriptFormatter from "react-dev-utils/typescriptFormatter";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CircularDependencyPlugin from "circular-dependency-plugin";
import ForkTsNotifier from "fork-ts-checker-notifier-webpack-plugin";
import WebpackNotifier from "webpack-notifier";
import WebpackBar from "webpackbar";
import _ from "lodash";

export function getPluginsForNodeWebpack(options: BuildNodeBuilderOptions, context: BuilderContext) {

  const isEnvDevelopment = options.dev;

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

  const notifierOptions = getNotifierOptions(options);

  return [

    new webpack.EnvironmentPlugin({
      NODE_ENV: options.dev ? "development" : "production"
    }),

    new webpack.DefinePlugin(getProcessedEnvironmentVariables(
      loadEnvironmentVariables(options, context), "env"
    ).stringified),

    getForkTsCheckerWebpackPlugin(options),

    // Watcher doesn't work well if you mistype casing in a path so we use
    // a plugin that prints an error when you attempt to do this.
    // See https://github.com/facebook/create-react-app/issues/240
    isEnvDevelopment && new CaseSensitivePathsPlugin(),

    options.progress && new WebpackBar({
      name: "client",
      fancy: isEnvDevelopment,
      basic: !isEnvDevelopment
    }),

    isEnvDevelopment && (options.notifier !== false) && new WebpackNotifier({
      title: context ? context.target.project : options.main,
      ...notifierOptions
    }),

    isEnvDevelopment && (options.notifier !== false) && new ForkTsNotifier({
      title: context ? context.target.project : options.main,
      ...notifierOptions,
      skipSuccessful: true // always skip successful for fork otherwise we get duplicate notifications
    }),

    options.extractLicenses && new LicenseWebpackPlugin({
      pattern: /.*/,
      suppressErrors: true,
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`
    }),

    options.assets && new CopyWebpackPlugin(
      copyWebpackPluginPatterns,
      copyWebpackPluginOptions
    ),

    options.showCircularDependencies && new CircularDependencyPlugin({
      exclude: /[\\\/]node_modules[\\\/]/
    })
  ].filter(Boolean);
}

function getForkTsCheckerWebpackPlugin(options: BuildNodeBuilderOptions) {
  const nodeModulesPath = findup("node_modules");
  const isEnvDevelopment = options.dev;
  const rootPath = findup("angular.json") || findup("nx.json") || options.root;

  const pnpPluginTs = _.isString(require.resolve("pnp-webpack-plugin/ts")) ?
    require.resolve("pnp-webpack-plugin/ts") : "pnp-webpack-plugin/ts";

  return new ForkTsCheckerWebpackPlugin({
    typescript: resolve.sync("typescript", {
      basedir: nodeModulesPath
    }),
    async: isEnvDevelopment,
    useTypescriptIncrementalApi: options.dev,
    workers: options.dev ? ForkTsCheckerWebpackPlugin.ONE_CPU : ForkTsCheckerWebpackPlugin.TWO_CPUS_FREE,
    checkSyntacticErrors: true,
    resolveModuleNameModule: (process.versions as any).pnp
      ? pnpPluginTs
      : undefined,
    resolveTypeReferenceDirectiveModule: (process.versions as any).pnp
      ? pnpPluginTs
      : undefined,
    tsconfig: options.tsConfig,
    reportFiles: [
      "**",
      "!**/__tests__/**",
      "!**/?(*.)(spec|test).*",
      "!**/src/setupTests.*"
    ],
    watch: rootPath,
    silent: false,
    formatter: typescriptFormatter
  });
}
