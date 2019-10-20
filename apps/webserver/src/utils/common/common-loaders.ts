import { createBabelConfig } from './babel-config';

import loaderUtils = require('loader-utils');
import path = require('path');

// style files regexes
export const cssRegex = /\.css$/;
export const cssModuleRegex = /\.module\.css$/;
export const sassRegex = /\.(scss|sass)$/;
export const sassModuleRegex = /\.module\.(scss|sass)$/;
export const lessRegex = /\.less$/;
export const lessModuleRegex = /\.module\.less$/;

export function getBaseLoaders(
  context: string,
  esm: boolean,
  debug: boolean,
  isEnvDevelopment: boolean,
  isEnvServer: boolean) {
  const isEnvProduction = !isEnvDevelopment;

  return [
    // Disable require.ensure as it's not a standard language feature.
    { parser: { requireEnsure: false } },
    {
      test: /\.([jt])sx?$/,
      loader: `babel-loader`,
      exclude: /node_modules/,
      options: {
        ...createBabelConfig(
          context,
          esm,
          debug,
          isEnvDevelopment,
          isEnvServer
        ),
        cacheDirectory: true,
        cacheCompression: false
      }
    }
  ];
}

export function getCSSModuleLocalIdent(
  context,
  localIdentName,
  localName,
  options
) {
  // Use the filename or folder name, based on some uses the index.js / index.module.(css|scss|sass|less) project style
  const fileNameOrFolder = context.resourcePath.match(
    /index\.module\.(css|scss|sass|less)$/
  )
    ? '[folder]'
    : '[name]';
  // Create a hash based on a the file location and class name. Will be unique across a project, and close to globally unique.
  const hash = loaderUtils.getHashDigest(
    path.posix.relative(context.rootContext, context.resourcePath) + localName,
    'md5',
    'base64',
    5
  );
  // Use loaderUtils to find the file or folder name
  const className = loaderUtils.interpolateName(
    context,
    fileNameOrFolder + '_' + localName + '__' + hash,
    options
  );
  // remove the .module that appears in every classname when based on the file.
  return className.replace('.module_', '_');
};
