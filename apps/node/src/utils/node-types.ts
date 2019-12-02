/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { IBuildBuilderOptions, ExternalDependencies, IFileReplacement } from "@apployees-nx/common-build-utils";

export interface IBuildNodeBuilderOptions extends IBuildBuilderOptions {
  main: string;
  otherEntries?: object;
  sourceMap?: boolean;
  externalDependencies?: ExternalDependencies;
  externalLibraries?: ExternalDependencies;
  fileReplacements: IFileReplacement[];
  webpackConfig?: string;
}
