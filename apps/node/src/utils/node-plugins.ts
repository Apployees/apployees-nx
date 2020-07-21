/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { IBuildNodeBuilderOptions } from "./node-types";
import { BuilderContext } from "@angular-devkit/architect";
import {
  getNotifierOptions,
  getProcessedEnvironmentVariables,
  loadEnvironmentVariables,
} from "@apployees-nx/common-build-utils";
import webpack from "webpack";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import typescriptFormatter from "react-dev-utils/typescriptFormatter";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CircularDependencyPlugin from "circular-dependency-plugin";
import ForkTsNotifier from "fork-ts-checker-notifier-webpack-plugin";
import WebpackNotifier from "webpack-notifier";
import WebpackBar from "webpackbar";
import path from 'path';
import HardSourceWebpackPlugin from "hard-source-webpack-plugin";
import NodeObjectHash from "node-object-hash";

export function getPluginsForNodeWebpack(options: IBuildNodeBuilderOptions, context: BuilderContext) {
  const isEnvDevelopment = options.dev;

  const copyWebpackPluginPatterns = options.assets.map((asset: any) => {
    return {
      context: asset.input,
      // Now we remove starting slash to make Webpack place it from the output root.
      to: asset.output,
      ignore: asset.ignore,
      from: {
        glob: asset.glob,
        dot: true,
      },
    };
  });

  const copyWebpackPluginOptions = {
    ignore: ["**/.DS_Store", "**/Thumbs.db"],
  };

  const notifierOptions = getNotifierOptions(options);

  return [
    new HardSourceWebpackPlugin({
      // Either an absolute path or relative to webpack's options.context.
      configHash: function(webpackConfig) {
        return NodeObjectHash({sort: false}).hash(webpackConfig);
      },
      cacheDirectory: path.join(
        options.buildCacheFolder,
        "hard-source-webpack-plugin",
        context.target.project,
      ),
      environmentHash: {
        root: options.root,
        directories: [],
        files: ['package-lock.json', 'yarn.lock']
      },
      // Clean up large, old caches automatically.
      cachePrune: {
        sizeThreshold: 500 * 1024 * 1024
      },
    }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: options.dev ? "development" : "production",
    }),

    new webpack.DefinePlugin(
      getProcessedEnvironmentVariables(loadEnvironmentVariables(options, context), "env").stringified as any,
    ),

    getForkTsCheckerWebpackPlugin(options, context, options.buildCacheFolder,),

    // Watcher doesn't work well if you mistype casing in a path so we use
    // a plugin that prints an error when you attempt to do this.
    // See https://github.com/facebook/create-react-app/issues/240
    isEnvDevelopment && new CaseSensitivePathsPlugin(),

    options.progress &&
      new WebpackBar({
        name: "client",
        fancy: isEnvDevelopment,
        basic: !isEnvDevelopment,
      }),

    isEnvDevelopment &&
      options.notifier !== false &&
      new WebpackNotifier({
        title: context ? context.target.project : options.main,
        ...notifierOptions,
      }),

    isEnvDevelopment &&
      options.notifier !== false &&
      new ForkTsNotifier({
        title: context ? context.target.project : options.main,
        ...notifierOptions,
        skipSuccessful: true, // always skip successful for fork otherwise we get duplicate notifications
      }),

    options.extractLicenses &&
      new LicenseWebpackPlugin({
        pattern: /.*/,
        suppressErrors: true,
        perChunkOutput: false,
        outputFilename: `3rdpartylicenses.txt`,
      }),

    options.assets && new CopyWebpackPlugin(copyWebpackPluginPatterns, copyWebpackPluginOptions),

    options.showCircularDependencies &&
      new CircularDependencyPlugin({
        // eslint-disable-next-line no-useless-escape
        exclude: /[\\\/]node_modules[\\\/]/,
      }),
  ].filter(Boolean);
}

function getForkTsCheckerWebpackPlugin(options: IBuildNodeBuilderOptions,
                                       context: BuilderContext,
                                       cacheFolder: string) {
  //const nodeModulesPath = findup("node_modules");
  const isEnvDevelopment = options.dev;
  //const rootPath = findup("angular.json") || findup("nx.json") || options.root;

  //const pnpPluginTs = _.isString(require.resolve("pnp-webpack-plugin/ts"))
  //  ? require.resolve("pnp-webpack-plugin/ts")
  //  : "pnp-webpack-plugin/ts";

  return new ForkTsCheckerWebpackPlugin({
    typescript: {
      configFile: options.tsConfig,
      configOverwrite: {
        compilerOptions: {
          incremental: true,
          tsBuildInfoFile: path.join(
            cacheFolder,
            "fork-ts-checker-webpack-plugin",
            context.target.project,
            ".tsbuildinfo",
          ),
          sourceMap: isEnvDevelopment,
        },
      },
      mode: "write-tsbuildinfo",
    },
    //issue: {
    //  exclude: ["**/__tests__/**", "**/?(*.)(spec|test).*", "**/src/setupTests.*"]
    //},
    //logger: {
    //  infrastructure: "silent",
    //  issues: "silent",
    //},
    async: isEnvDevelopment,
    // The formatter is invoked directly in WebpackDevServerUtils during development
    formatter: !isEnvDevelopment ? typescriptFormatter : undefined,
  });
}
