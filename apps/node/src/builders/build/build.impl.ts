import { BuilderContext, createBuilder } from "@angular-devkit/architect";
import { JsonObject } from "@angular-devkit/core";
import { BuildResult, runWebpack } from "@angular-devkit/build-webpack";

import { from, Observable, of } from "rxjs";
import path, { resolve } from "path";
import { concatMap, map } from "rxjs/operators";
import { getNodeWebpackConfig } from "../../utils/node.config";
import { getSourceRoot, OUT_FILENAME, WebpackBuildEvent, writePackageJson } from "@apployees-nx/common-build-utils";
import { normalizeBuildOptions } from "../../utils/normalize";
import { BuildNodeBuilderOptions } from "../../utils/node-types";
import webpack, { Configuration } from "webpack";
import { createCompiler } from "react-dev-utils/WebpackDevServerUtils";
import fs from "fs-extra";

try {
  require('dotenv').config();
} catch (e) {}


export default createBuilder<JsonObject & BuildNodeBuilderOptions>(run);

function run(
  options: JsonObject & BuildNodeBuilderOptions,
  context: BuilderContext
): Observable<WebpackBuildEvent> {

  const nodeEnv: string = options.dev ? "development" : "production";
  // do this otherwise our bootstrapped @apployees-nx/node actually replaces this
  // to "development" or "production" at build time.
  const nodeEnvKey = "NODE_ENV";
  const babelEnvKey = "BABEL_ENV";
  process.env[nodeEnvKey] = nodeEnv;
  process.env[babelEnvKey] = nodeEnv;

  let yarnExists;

  return from(getSourceRoot(context)).pipe(
    map(sourceRoot =>
      normalizeBuildOptions(options, context, sourceRoot)
    ),
    map(options => {
      yarnExists = fs.existsSync(path.resolve(options.root, "yarn.lock"));
      let config = getNodeWebpackConfig(options, context);
      if (options.webpackConfig) {
        config = require(options.webpackConfig)(config, {
          options,
          configuration: context.target.configuration
        });
      }
      return config;
    }),
    concatMap(config =>
      runWebpack(config, context, {
        logging: stats => {
          context.logger.info(stats.toString(config.stats));
        },
        webpackFactory: (config: Configuration) => of(createCompiler({
          webpack: webpack,
          config: config,
          appName: context.target.project,
          useYarn: yarnExists,
          tscCompileOnError: true,
          useTypeScript: true,
        }))
      })
    ),
    map((buildEvent: BuildResult) => {
      buildEvent.outfile = resolve(
        context.workspaceRoot,
        options.outputPath,
        OUT_FILENAME
      );
      return buildEvent as WebpackBuildEvent;
    }),
    map((buildEvent: WebpackBuildEvent) => {
      writePackageJson(options, context, options.externalDependencies, options.externalLibraries);
      return buildEvent;
    })
  );
}
