import { resolve } from 'path';
import {
  normalizeAssets,
  normalizeFileReplacements,
  normalizeOtherEntries
} from '@apployees-nx/common-build-utils';
import { BuildNodeBuilderOptions } from './node-types';


export function normalizeBuildOptions<T extends BuildNodeBuilderOptions>(
  options: T,
  root: string,
  sourceRoot: string
): T {
  return {
    ...options,
    root: root,
    sourceRoot: sourceRoot,
    main: resolve(root, options.main),
    otherEntries: normalizeOtherEntries(root, options.otherEntries),
    outputPath: resolve(root, options.outputPath),
    tsConfig: resolve(root, options.tsConfig),
    fileReplacements: normalizeFileReplacements(root, options.fileReplacements),
    assets: normalizeAssets(options.assets, root, sourceRoot),
    webpackConfig: options.webpackConfig
      ? resolve(root, options.webpackConfig)
      : options.webpackConfig
  } as T;
}
