/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { readNxJson } from "@nrwl/workspace";
import { getExternalizedLibraryImports } from "./externalized-imports";
import _ from "lodash";
import nodeExternals from "webpack-node-externals";
import findup from "findup-sync";

export function getNodeExternals(
  externalLibraries,
  externalDependencies,
  nodeExternalsWhitelist: (string | RegExp)[] = [],
) {
  const nxJson = readNxJson();
  const npmScope = nxJson.npmScope;
  const npmScopeStr = `@${npmScope}/`;

  const isLibraryExternalized = getExternalizedLibraryImports(externalLibraries, npmScope);
  const externalizedLibrariesArray = _.keys(isLibraryExternalized);

  const _nodeExternals = nodeExternals({
    modulesDir: findup("node_modules"),
    whitelist: nodeExternalsWhitelist.filter(Boolean),
  });

  return [
    function(context, request, callback: Function) {
      if (_.isString(request) && request.startsWith(npmScopeStr)) {
        if (externalLibraries === "all" || isLibraryExternalized[request]) {
          // not bundled
          return callback(null, "commonjs " + request);
        } else if (externalizedLibrariesArray.length > 0) {
          // go through all the external libraries and check if it's a prefix
          // of any library we are externalizing...
          const found = _.find(externalizedLibrariesArray, library => request.startsWith(library));
          if (found) {
            // not bundled
            return callback(null, "commonjs " + request);
          }
        }

        // bundled
        callback();
        return;
      }

      if (externalDependencies === "all") {
        return _nodeExternals(context, request, callback);
      } else if (_.isArray(externalDependencies) && externalDependencies.includes(request)) {
        // not bundled
        return callback(null, "commonjs " + request);
      }

      // bundled
      callback();
    },
  ];
}
