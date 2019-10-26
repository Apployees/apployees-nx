import { Path } from '@angular-devkit/core';
import { BuildResult } from '@angular-devkit/build-webpack';

export interface FileReplacement {
  replace: string;
  with: string;
}

export interface SourceMapOptions {
  scripts: boolean;
  styles: boolean;
  vendors: boolean;
  hidden: boolean;
}

export interface NotifierType {
  excludeWarnings: boolean;
  alwaysNotify: boolean;
  skipFirstNotification: boolean;
  skipSuccessful: boolean;
}

export interface BuildBuilderOptions {
  dev?: boolean;
  outputPath: string;
  tsConfig: string;
  watch?: boolean;
  sourceMap?: boolean | SourceMapOptions;
  showCircularDependencies?: boolean;
  poll?: number;

  assets?: any[];
  envFolderPath?: string;
  additionalEnvFile?: string;

  progress?: boolean;
  notifier?: NotifierType|boolean;
  statsJson?: boolean;
  extractLicenses?: boolean;
  verbose?: boolean;

  root?: string;
  sourceRoot?: Path;
}

export type ExternalDependencies = 'all' | 'none' | string[];

export const OUT_FILENAME = '[name].js';

export type WebpackBuildEvent = BuildResult & {
  outfile: string;
};

export enum InspectType {
  Inspect = 'inspect',
  InspectBrk = 'inspect-brk'
}
