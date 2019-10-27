import { BuildNodeBuilderOptions } from "./node-types";
import { BuilderContext } from "@angular-devkit/architect";
import {
  getCleanPlugin,
  getProcessedEnvironmentVariables,
  loadEnvironmentVariables
} from "@apployees-nx/common-build-utils";
import webpack from "webpack";
import ForkTsCheckerWebpackPlugin from "react-dev-utils/ForkTsCheckerWebpackPlugin";
import resolve from "resolve";
import findup from "findup-sync";
import typescriptFormatter from "react-dev-utils/typescriptFormatter";

export function getPluginsForNodeWebpack(options: BuildNodeBuilderOptions, context: BuilderContext) {
  return [

    getCleanPlugin(options),

    new webpack.EnvironmentPlugin({
      NODE_ENV: options.dev ? "development" : "production"
    }),

    new webpack.DefinePlugin(getProcessedEnvironmentVariables(
      loadEnvironmentVariables(options, context), "env"
    ).stringified),

    getForkTsCheckerWebpackPlugin(options)
  ];
}

function getForkTsCheckerWebpackPlugin(options: BuildNodeBuilderOptions) {
  const nodeModulesPath = findup("node_modules");
  const isEnvDevelopment = options.dev;
  const rootPath = findup("angular.json") || findup("nx.json") || options.root;

  return new ForkTsCheckerWebpackPlugin({
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
    silent: false,
    formatter: typescriptFormatter
  });
}
