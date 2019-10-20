import { resolve } from 'path';
import { normalizeAssets, normalizeFileReplacements, normalizeOtherEntries } from '@apployees-nx/common-build-utils';
import { BuildWebserverBuilderOptions } from './webserver-types';
import { FILENAMES } from './common-config';


export function normalizeBuildOptions<T extends BuildWebserverBuilderOptions>(
  options: T,
  root: string,
  sourceRoot: string
): T {
  const outputPath = resolve(root, options.outputPath);
  return {
    ...options,
    root: root,
    sourceRoot: sourceRoot,
    outputPath: outputPath,
    tsConfig: resolve(root, options.tsConfig),
    assets: normalizeAssets(options.assets, root, sourceRoot),
    publicOutputFolder_calculated: resolve(outputPath, FILENAMES.publicFolder),
    appHtml: resolve(root, options.appHtml),

    serverMain: resolve(root, options.serverMain),
    serverFileReplacements: normalizeFileReplacements(root, options.serverFileReplacements),
    serverWebpackConfig: options.serverWebpackConfig
      ? resolve(root, options.serverWebpackConfig)
      : options.serverWebpackConfig,

    clientMain: resolve(root, options.clientMain),
    clientOtherEntries: normalizeOtherEntries(root, options.clientOtherEntries),
    clientFileReplacements: normalizeFileReplacements(root, options.clientFileReplacements),
    clientWebpackConfig: options.clientWebpackConfig
      ? resolve(root, options.clientWebpackConfig)
      : options.clientWebpackConfig
  } as T;
}
