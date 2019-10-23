import { resolve } from "path";
import {
  getDefaultEnvsFolderForProject,
  loadEnvironmentVariables,
  normalizeAssets,
  normalizeFileReplacements,
  normalizeOtherEntries
} from "@apployees-nx/common-build-utils";
import { BuildNodeBuilderOptions } from "./node-types";
import { BuilderContext } from "@angular-devkit/architect";


export function normalizeBuildOptions<T extends BuildNodeBuilderOptions>(
  options: T,
  context: BuilderContext,
  sourceRoot: string
): T {

  const root = context.workspaceRoot;

  const normalized: T = {
    ...options,
    root: root,
    sourceRoot: sourceRoot,
    main: resolve(root, options.main),
    envFolderPath: options.envFolderPath ?
      resolve(root, options.envFolderPath) : getDefaultEnvsFolderForProject(root, context),
    additionalEnvFile: options.additionalEnvFile ?
      resolve(root, options.additionalEnvFile) : options.additionalEnvFile,
    otherEntries: normalizeOtherEntries(root, options.otherEntries),
    outputPath: resolve(root, options.outputPath),
    tsConfig: resolve(root, options.tsConfig),
    fileReplacements: normalizeFileReplacements(root, options.fileReplacements),
    assets: normalizeAssets(options.assets, root, sourceRoot),
    webpackConfig: options.webpackConfig
      ? resolve(root, options.webpackConfig)
      : options.webpackConfig
  } as T;

  loadEnvironmentVariables(normalized, context);

  return normalized;
}
