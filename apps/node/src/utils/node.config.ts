import { Configuration } from 'webpack';
import * as mergeWebpack from 'webpack-merge';

import { getNodeExternals } from '@apployees-nx/common-build-utils';
import { getBaseWebpackPartial } from './config';
import { BuildNodeBuilderOptions } from './node-types';

function getNodePartial(options: BuildNodeBuilderOptions) {
  const webpackConfig: Configuration = {
    output: {
      libraryTarget: 'commonjs'
    },
    target: 'node',
    node: false
  };

  if (options.optimization) {
    webpackConfig.optimization = {
      minimize: false,
      concatenateModules: false
    };
  }

  const externalDependencies = options.externalDependencies;
  const externalLibraries = options.externalLibraries;

  webpackConfig.externals = getNodeExternals(externalLibraries, externalDependencies);

  return webpackConfig;
}

export function getNodeWebpackConfig(options: BuildNodeBuilderOptions) {
  return mergeWebpack([
    getBaseWebpackPartial(options),
    getNodePartial(options)
  ]);
}
