import { Rule, chain } from "@angular-devkit/schematics";
import {
  addDepsToPackageJson,
  updateJsonInTree,
  addPackageWithInit,
  updateWorkspace,
  formatFiles
} from "@nrwl/workspace";
import { Schema } from "./schema";
import { nxVersion } from "@apployees-nx/common-build-utils";
import { JsonObject } from "@angular-devkit/core";

function addDependencies(): Rule {
  return addDepsToPackageJson(
    {},
    {
      "@apployees-nx/webserver": nxVersion,

      // these are dependencies that are part of the generated code. We need to
      // add them here because webserver doesn't directly depend on them and so
      // we cannot put them into webserver's own package.json. However, they
      // should be part of the project in which the code is being generated.
      "antd": "^3.24.3",
      "domurl": "^2.2.0",
      "escape-string-regexp": "^2.0.0",
      "express": "^4.17.1",
      "react": "^16.10.2",
      "react-dom": "^16.10.2",
      "selfsigned": "^1.10.7"
    }
  );
}

function moveDependency(): Rule {
  return updateJsonInTree("package.json", json => {
    json.dependencies = json.dependencies || {};

    delete json.dependencies["@apployees-nx/webserver"];
    return json;
  });
}

function setDefault(): Rule {
  return updateWorkspace(workspace => {
    workspace.extensions.cli = workspace.extensions.cli || {};

    const defaultCollection: string =
      workspace.extensions.cli &&
      ((workspace.extensions.cli as JsonObject).defaultCollection as string);

    if (!defaultCollection || defaultCollection === "@nrwl/workspace") {
      (workspace.extensions.cli as JsonObject).defaultCollection = "@apployees-nx/webserver";
    }
  });
}

export default function(schema: Schema) {
  return chain([
    setDefault(),
    addPackageWithInit("@nrwl/jest"),
    addDependencies(),
    moveDependency(),
    formatFiles(schema)
  ]);
}
