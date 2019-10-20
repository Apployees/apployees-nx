import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { BuildResult, runWebpack } from '@angular-devkit/build-webpack';

import { from, Observable } from 'rxjs';
import { resolve } from 'path';
import { concatMap, map } from 'rxjs/operators';
import { getNodeWebpackConfig } from '../../utils/node.config';
import { getSourceRoot, OUT_FILENAME, WebpackBuildEvent, writePackageJson } from '@apployees-nx/common-build-utils';
import { normalizeBuildOptions } from '../../utils/normalize';
import { BuildNodeBuilderOptions } from '../../utils/node-types';

try {
  require('dotenv').config();
} catch (e) {}


export default createBuilder<JsonObject & BuildNodeBuilderOptions>(run);

function run(
  options: JsonObject & BuildNodeBuilderOptions,
  context: BuilderContext
): Observable<WebpackBuildEvent> {

  const mode = options.dev ? 'development' : 'production';
  // do this otherwise our bootstrapped @apployees-nx/node actually replaces this
  // to "development" or "production" at build time.
  const nodeEnv = "NODE_ENV";
  const babelEnv = "BABEL_ENV";
  process.env[nodeEnv] = mode;
  process.env[babelEnv] = mode;

  return from(getSourceRoot(context)).pipe(
    map(sourceRoot =>
      normalizeBuildOptions(options, context.workspaceRoot, sourceRoot)
    ),
    map(options => {
      let config = getNodeWebpackConfig(options);
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
        }
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
