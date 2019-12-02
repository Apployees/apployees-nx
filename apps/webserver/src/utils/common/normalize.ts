/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { resolve } from "path";
import {
  getDefaultEnvsFolderForProject,
  normalizeAssets,
  normalizeFileReplacements,
  normalizeOtherEntries,
} from "@apployees-nx/common-build-utils";
import { IBuildWebserverBuilderOptions } from "./webserver-types";
import { FILENAMES } from "./common-config";
import { BuilderContext } from "@angular-devkit/architect";
import lessVariablesToJs from "less-vars-to-js";
import { existsSync, readFileSync } from "fs";

export function normalizeBuildOptions(
  options: IBuildWebserverBuilderOptions,
  context: BuilderContext,
  sourceRoot: string,
): IBuildWebserverBuilderOptions {
  const root = context.workspaceRoot;

  const outputPath = resolve(root, options.outputPath);

  const lessVariablesFile = options.lessStyleVariables
    ? resolve(root, options.lessStyleVariables)
    : options.lessStyleVariables;

  return {
    ...options,
    root: root,
    sourceRoot: sourceRoot,
    outputPath: outputPath,
    tsConfig: resolve(root, options.tsConfig),
    assets: normalizeAssets(options.assets, root, sourceRoot),
    favicon: resolve(root, options.favicon),
    manifestJson: resolve(root, options.manifestJson),
    envFolderPath: options.envFolderPath
      ? resolve(root, options.envFolderPath)
      : getDefaultEnvsFolderForProject(root, context),
    additionalEnvFile: options.additionalEnvFile ? resolve(root, options.additionalEnvFile) : options.additionalEnvFile,
    // eslint-disable-next-line @typescript-eslint/camelcase
    publicOutputFolder_calculated: resolve(outputPath, FILENAMES.publicFolder),
    appHtml: resolve(root, options.appHtml),

    serverMain: resolve(root, options.serverMain),
    serverFileReplacements: normalizeFileReplacements(root, options.serverFileReplacements),
    lessStyleVariables: lessVariablesFile,
    // eslint-disable-next-line @typescript-eslint/camelcase
    lessStyleVariables_calculated: calculateLessVariables(options, lessVariablesFile),
    serverWebpackConfig: options.serverWebpackConfig
      ? resolve(root, options.serverWebpackConfig)
      : options.serverWebpackConfig,

    clientMain: resolve(root, options.clientMain),
    clientOtherEntries: normalizeOtherEntries(root, options.clientOtherEntries),
    clientFileReplacements: normalizeFileReplacements(root, options.clientFileReplacements),
    clientWebpackConfig: options.clientWebpackConfig
      ? resolve(root, options.clientWebpackConfig)
      : options.clientWebpackConfig,
  } as IBuildWebserverBuilderOptions;
}

function calculateLessVariables(options: IBuildWebserverBuilderOptions, normalizedLessVariablesFile: string): object {
  let variables: object;

  if (existsSync(normalizedLessVariablesFile)) {
    variables = lessVariablesToJs(readFileSync(normalizedLessVariablesFile, "utf-8"));
  } else {
    variables = {};
  }

  return variables;
}
