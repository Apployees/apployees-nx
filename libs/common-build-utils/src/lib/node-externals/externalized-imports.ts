import { readWorkspaceJson } from '@nrwl/workspace';
import * as _ from 'lodash';
import { ExternalDependencies } from '../types/common-types';

/**
 * the name of the import as it appears in code
 * such as: @apployees-nx/examples/library1 to true if the library should
 * be externalized.
 */
export function getExternalizedLibraryImports(
  externalLibraries: ExternalDependencies,
  npmScope: string): _.Dictionary<true> {
  const isLibraryExternalized: _.Dictionary<true> = {};

  if (externalLibraries === 'all' || _.isArray(externalLibraries)) {

    const workspaceJson = readWorkspaceJson();

    const possibleProjectIds: _.Dictionary<string> = {};

    /*
    first, we generate the permutations of all the types of IDs we may encounter
    in the externalLibraries array

    E.g.

    "externalLibraries": [
       "examples-library1",
       "examples/library1",
       "@apployees-nx/examples/library1"
     ]
     */
    _.forEach(workspaceJson.projects, (project, projectName) => {
      if (project.projectType === 'library') {
        const projectRootWithoutAppsOrLibs = project.root.split('/').slice(1).join('/');
        const importName = `@${npmScope}/${projectRootWithoutAppsOrLibs}`;

        if (externalLibraries === 'all') {
          isLibraryExternalized[importName] = true;
        } else {
          // let's just save them here for now, we will come back to them and
          // use them to look up externalLibraries
          possibleProjectIds[importName] = importName;
          possibleProjectIds[projectName] = importName;
          possibleProjectIds[projectRootWithoutAppsOrLibs] = importName;
          possibleProjectIds[project.root] = importName;
          possibleProjectIds[project.sourceRoot] = importName;
        }
      }
    });

    /*
    Now that we have a list of all possible project ID mappings, we can look up
    them up using externalLibraries array to figure out which libraries need to be
    externalized...
     */
    if (_.isArray(externalLibraries)) {
      _.forEach(externalLibraries, externalLibrary => {
        const importName = possibleProjectIds[externalLibrary];
        if (importName) {
          isLibraryExternalized[importName] = true;
        } else {
          // we weren't able to find it, but add this as-is anyway. Perhaps the
          // project has been deleted now and the import still exists, or that
          // it is being run as part of some tests.
          isLibraryExternalized[externalLibrary] = true;
        }
      });
    }
  }

  return isLibraryExternalized;
}
