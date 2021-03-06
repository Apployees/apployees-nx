/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { Configuration } from "webpack";
import mergeWebpack from "webpack-merge";

import { getNodeExternals } from "@apployees-nx/common-build-utils";
import { getBaseWebpackPartial } from "./config";
import { IBuildNodeBuilderOptions } from "./node-types";
import { BuilderContext } from "@angular-devkit/architect";

function getNodePartial(options: IBuildNodeBuilderOptions) {
  const webpackConfig: Configuration = {
    output: {
      libraryTarget: "commonjs",
    },
    target: "node",
    node: false,
  };

  if (!options.dev) {
    webpackConfig.optimization = {
      minimize: false,
      concatenateModules: false,
    };
  }

  const externalDependencies = options.externalDependencies;
  const externalLibraries = options.externalLibraries;

  webpackConfig.externals = getNodeExternals(externalLibraries, externalDependencies);

  return webpackConfig;
}

export function getNodeWebpackConfig(options: IBuildNodeBuilderOptions, context?: BuilderContext) {
  return mergeWebpack([getBaseWebpackPartial(options, context), getNodePartial(options)]);
}
