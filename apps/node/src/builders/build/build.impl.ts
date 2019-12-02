/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { BuilderContext, createBuilder } from "@angular-devkit/architect";
import { JsonObject } from "@angular-devkit/core";
import { BuildResult, runWebpack } from "@angular-devkit/build-webpack";

import { from, Observable } from "rxjs";
import path, { resolve } from "path";
import { concatMap, map } from "rxjs/operators";
import { getNodeWebpackConfig } from "../../utils/node.config";
import { getSourceRoot, OUT_FILENAME, WebpackBuildEvent, writePackageJson } from "@apployees-nx/common-build-utils";
import { normalizeBuildOptions } from "../../utils/normalize";
import { IBuildNodeBuilderOptions } from "../../utils/node-types";
import fs from "fs-extra";

try {
  require("dotenv").config();
} catch (e) {
  console.error("Error while loading dotenv config.");
  console.error(e);
}

export default createBuilder<JsonObject & IBuildNodeBuilderOptions>(run);

function run(options: JsonObject & IBuildNodeBuilderOptions, context: BuilderContext): Observable<WebpackBuildEvent> {
  const nodeEnv: string = options.dev ? "development" : "production";
  // do this otherwise our bootstrapped @apployees-nx/node actually replaces this
  // to "development" or "production" at build time.
  const nodeEnvKey = "NODE_ENV";

  // we don't actually need this since we don't use babel for @apployees-nx/node. But keeping it around anyway in case
  // we add Babel in the future.
  const babelEnvKey = "BABEL_ENV";
  process.env[nodeEnvKey] = nodeEnv;
  process.env[babelEnvKey] = nodeEnv;

  let yarnExists;

  return from(getSourceRoot(context)).pipe(
    map(sourceRoot => normalizeBuildOptions(options, context, sourceRoot)),
    map(options => {
      yarnExists = fs.existsSync(path.resolve(options.root, "yarn.lock"));
      let config = getNodeWebpackConfig(options, context);
      if (options.webpackConfig) {
        config = __non_webpack_require__(options.webpackConfig)(config, {
          options,
          configuration: context.target.configuration,
        });
      }
      return [options, config];
    }),
    map(([options, config]) => {
      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      fs.emptyDirSync(options.outputPath);

      return config;
    }),
    concatMap(config =>
      runWebpack(config, context, {
        logging: stats => {
          context.logger.info(stats.toString(config.stats));
        },
      }),
    ),
    map((buildEvent: BuildResult) => {
      buildEvent.outfile = resolve(context.workspaceRoot, options.outputPath, OUT_FILENAME);
      return buildEvent as WebpackBuildEvent;
    }),
    map((buildEvent: WebpackBuildEvent) => {
      // we write the package.json every time, even on dev=true because the user may be developing
      // an npm bundle that is linked to node_modules.
      writePackageJson(options, context, options.externalDependencies, options.externalLibraries);
      return buildEvent;
    }),
  );
}

// eslint-disable-next-line @typescript-eslint/camelcase
declare function __non_webpack_require__(string): any;
