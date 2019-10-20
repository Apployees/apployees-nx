import { BuildBuilderOptions, ExternalDependencies, FileReplacement } from '@apployees-nx/common-build-utils';

export interface BuildNodeBuilderOptions extends BuildBuilderOptions {
  main: string;
  otherEntries?: object;
  optimization?: boolean;
  sourceMap?: boolean;
  externalDependencies?: ExternalDependencies;
  externalLibraries?: ExternalDependencies;
  fileReplacements: FileReplacement[];
  webpackConfig?: string;
}
