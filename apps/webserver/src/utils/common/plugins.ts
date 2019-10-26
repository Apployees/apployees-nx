
import { BuildWebserverBuilderOptions } from "./webserver-types";
import { getWebserverEnvironmentVariables } from "./env";
import resolve from "resolve";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import WriteFileWebpackPlugin from "write-file-webpack-plugin";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import ModuleNotFoundPlugin from "react-dev-utils/ModuleNotFoundPlugin";
import ForkTsCheckerWebpackPlugin from "react-dev-utils/ForkTsCheckerWebpackPlugin";
import typescriptFormatter from "react-dev-utils/typescriptFormatter";
import WatchMissingNodeModulesPlugin from "react-dev-utils/WatchMissingNodeModulesPlugin";
import findup from "findup-sync";
import { BuilderContext } from "@angular-devkit/architect";
import ForkTsNotifier from "fork-ts-checker-notifier-webpack-plugin";
import WebpackNotifier from "webpack-notifier";
import { getNotifierOptions } from "@apployees-nx/common-build-utils";

export function getPlugins(options: BuildWebserverBuilderOptions,
                           context: BuilderContext,
                           isEnvClient: boolean) {
  const isEnvDevelopment = options.dev;
  const isEnvProduction = !options.dev;
  const nodeModulesPath = findup("node_modules");
  const rootPath = findup("angular.json") || findup("nx.json") || options.root;
  const notifierOptions = getNotifierOptions(options);

  return [
    isEnvDevelopment && (options.notifier !== false) &&
    new WebpackNotifier({
      title: context.target.project,
      ...notifierOptions
    }),
    isEnvDevelopment && (options.notifier !== false) &&
    new ForkTsNotifier({
      title: context.target.project,
      ...notifierOptions,
      skipSuccessful: true // always skip successful for fork otherwise we get duplicate notifications
    }),

    // This gives some necessary context to module not found errors, such as
    // the requesting resource.
    new ModuleNotFoundPlugin(rootPath),


    // Makes some environment variables available to the JS code, for example:
    // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
    // It is absolutely essential that NODE_ENV is set to production
    // during a production build.
    // Otherwise React will be compiled in the very slow development mode.

    // we use define here instead of EnvironmentPlugin because on the browser
    // process.env needs to be completely defined (i.e. it doesn't already
    // exist)
    isEnvClient && new webpack.DefinePlugin({
      NODE_ENV: options.dev ? "development" : "production",
      RENDER_ENV: "client"
    }),
    // on the server tho, we need the EnvironmentPlugin because we do not want
    // to overwrite all of process.env
    !isEnvClient && new webpack.EnvironmentPlugin({
      NODE_ENV: options.dev ? "development" : "production",
      RENDER_ENV: "server"
    }),

    // now we define the env variables loaded from .env files into the top-level
    // 'env' object.
    new webpack.DefinePlugin(
      getWebserverEnvironmentVariables(
        options, context, isEnvClient).stringified),

    // This is necessary to emit hot updates
    isEnvDevelopment && new WriteFileWebpackPlugin(),
    isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
    // Watcher doesn't work well if you mistype casing in a path so we use
    // a plugin that prints an error when you attempt to do this.
    // See https://github.com/facebook/create-react-app/issues/240
    isEnvDevelopment && new CaseSensitivePathsPlugin(),
    // If you require a missing module and then `npm install` it, you still have
    // to restart the development server for Webpack to discover it. This plugin
    // makes the discovery automatic so you don't have to restart.
    // See https://github.com/facebook/create-react-app/issues/186
    isEnvDevelopment && new WatchMissingNodeModulesPlugin(nodeModulesPath),
    isEnvProduction &&
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "static/css/[name].[contenthash:8].css",
      chunkFilename: "static/css/[name].[contenthash:8].chunk.css"
    }),
    // Moment.js is an extremely popular library that bundles large locale files
    // by default due to how Webpack interprets its code. This is a practical
    // solution that requires the user to opt into importing specific locales.
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    // You can remove this if you don't use Moment.js:
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    // TypeScript type checking
    new ForkTsCheckerWebpackPlugin({
      typescript: resolve.sync("typescript", {
        basedir: nodeModulesPath
      }),
      async: isEnvDevelopment,
      useTypescriptIncrementalApi: true,
      checkSyntacticErrors: true,
      resolveModuleNameModule: (process.versions as any).pnp
        ? `${__dirname}/pnpTs.js`
        : undefined,
      resolveTypeReferenceDirectiveModule: (process.versions as any).pnp
        ? `${__dirname}/pnpTs.js`
        : undefined,
      tsconfig: options.tsConfig,
      reportFiles: [
        "**",
        "!**/__tests__/**",
        "!**/?(*.)(spec|test).*",
        "!**/src/setupTests.*"
      ],
      watch: rootPath,
      silent: true,
      // The formatter is invoked directly in WebpackDevServerUtils during development
      formatter: isEnvProduction ? typescriptFormatter : undefined
    })
  ];
}
