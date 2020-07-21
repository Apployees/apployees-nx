/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { Path } from "@angular-devkit/core";
import { BuildResult } from "@angular-devkit/build-webpack";

export interface IFileReplacement {
  replace: string;
  with: string;
}

export interface ISourceMapOptions {
  scripts: boolean;
  styles: boolean;
  vendors: boolean;
  hidden: boolean;
}

export interface INotifierType {
  excludeWarnings: boolean;
  alwaysNotify: boolean;
  skipFirstNotification: boolean;
  skipSuccessful: boolean;
}

export interface IBuildBuilderOptions {
  dev?: boolean;
  outputPath: string;
  tsConfig: string;
  watch?: boolean;
  sourceMap?: boolean | ISourceMapOptions;
  showCircularDependencies?: boolean;
  poll?: number;

  assets?: any[];
  envFolderPath?: string;
  additionalEnvFile?: string;

  progress?: boolean;
  notifier?: INotifierType | boolean;
  statsJson?: boolean;
  extractLicenses?: boolean;
  buildCacheFolder?: string;
  verbose?: boolean;

  root?: string;
  sourceRoot?: Path;
}

export type ExternalDependencies = "all" | "none" | string[];

export const OUT_FILENAME = "[name].js";

export type WebpackBuildEvent = BuildResult & {
  outfile: string;
};

export enum InspectType {
  Inspect = "inspect",
  InspectBrk = "inspect-brk",
}
