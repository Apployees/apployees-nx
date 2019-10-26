import { BuildBuilderOptions, ExternalDependencies, FileReplacement } from '@apployees-nx/common-build-utils';

export interface BuildNodeBuilderOptions extends BuildBuilderOptions {
  main: string;
  otherEntries?: object;
  sourceMap?: boolean;
  externalDependencies?: ExternalDependencies;
  externalLibraries?: ExternalDependencies;
  fileReplacements: FileReplacement[];
  webpackConfig?: string;
}
