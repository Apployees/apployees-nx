/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { chain, Rule } from "@angular-devkit/schematics";
import {
  addDepsToPackageJson,
  addPackageWithInit,
  formatFiles,
  updateJsonInTree,
  updateWorkspace,
} from "@nrwl/workspace";
import { Schema } from "./schema";
import { JsonObject } from "@angular-devkit/core";
import findup from "findup-sync";
import fs from "fs";

function addDependencies(): Rule {
  const thisModulePackageJson = JSON.parse(fs.readFileSync(findup("package.json", { cwd: __dirname }), "utf-8"));

  return addDepsToPackageJson(
    {},
    {
      "@apployees-nx/webserver": thisModulePackageJson.version,

      // these are dependencies that are part of the generated code. We need to
      // add them here because webserver doesn't directly depend on them and so
      // we cannot put them into webserver's own package.json. However, they
      // should be part of the project in which the code is being generated.
      antd: thisModulePackageJson.devDependencies["antd"] || thisModulePackageJson.dependencies["antd"],
      domurl: thisModulePackageJson.devDependencies["domurl"] || thisModulePackageJson.dependencies["domurl"],
      "escape-string-regexp":
        thisModulePackageJson.devDependencies["escape-string-regexp"] ||
        thisModulePackageJson.dependencies["escape-string-regexp"],
      express: thisModulePackageJson.devDependencies["express"] || thisModulePackageJson.dependencies["express"],
      react: thisModulePackageJson.devDependencies["react"] || thisModulePackageJson.dependencies["react"],
      "react-dom":
        thisModulePackageJson.devDependencies["react-dom"] || thisModulePackageJson.dependencies["react-dom"],
      selfsigned:
        thisModulePackageJson.devDependencies["selfsigned"] || thisModulePackageJson.dependencies["selfsigned"],
      "@babel/preset-react":
        thisModulePackageJson.devDependencies["@babel/preset-react"] ||
        thisModulePackageJson.dependencies["@babel/preset-react"],
      "@typescript-eslint/eslint-plugin":
        thisModulePackageJson.devDependencies["@typescript-eslint/eslint-plugin"] ||
        thisModulePackageJson.dependencies["@typescript-eslint/eslint-plugin"],
      "@typescript-eslint/parser":
        thisModulePackageJson.devDependencies["@typescript-eslint/parser"] ||
        thisModulePackageJson.dependencies["@typescript-eslint/parser"],
      "@nrwl/jest":
        thisModulePackageJson.devDependencies["@nrwl/jest"] || thisModulePackageJson.dependencies["@nrwl/jest"],
      "@nrwl/eslint-plugin-nx":
        thisModulePackageJson.devDependencies["@nrwl/eslint-plugin-nx"] ||
        thisModulePackageJson.dependencies["@nrwl/eslint-plugin-nx"],
      "@types/jest":
        thisModulePackageJson.devDependencies["@types/jest"] || thisModulePackageJson.dependencies["@types/jest"],
      "@nrwl/linter":
        thisModulePackageJson.devDependencies["@nrwl/linter"] || thisModulePackageJson.dependencies["@nrwl/linter"],
      eslint: thisModulePackageJson.devDependencies["eslint"] || thisModulePackageJson.dependencies["eslint"],
      "eslint-config-prettier":
        thisModulePackageJson.devDependencies["eslint-config-prettier"] ||
        thisModulePackageJson.dependencies["eslint-config-prettier"],
      "eslint-plugin-import":
        thisModulePackageJson.devDependencies["eslint-plugin-import"] ||
        thisModulePackageJson.dependencies["eslint-plugin-import"],
      "eslint-plugin-jsx-a11y":
        thisModulePackageJson.devDependencies["eslint-plugin-jsx-a11y"] ||
        thisModulePackageJson.dependencies["eslint-plugin-jsx-a11y"],
      "eslint-plugin-react":
        thisModulePackageJson.devDependencies["eslint-plugin-react"] ||
        thisModulePackageJson.dependencies["eslint-plugin-react"],
      "eslint-plugin-react-hooks":
        thisModulePackageJson.devDependencies["eslint-plugin-react-hooks"] ||
        thisModulePackageJson.dependencies["eslint-plugin-react-hooks"],
      "jest-environment-jsdom-fourteen":
        thisModulePackageJson.devDependencies["jest-environment-jsdom-fourteen"] ||
        thisModulePackageJson.dependencies["jest-environment-jsdom-fourteen"],
      "react-app-polyfill":
        thisModulePackageJson.devDependencies["react-app-polyfill"] ||
        thisModulePackageJson.dependencies["react-app-polyfill"],
    },
  );
}

function moveDependency(): Rule {
  return updateJsonInTree("package.json", (json) => {
    json.dependencies = json.dependencies || {};

    delete json.dependencies["@apployees-nx/webserver"];
    return json;
  });
}

function setDefault(): Rule {
  return updateWorkspace((workspace) => {
    workspace.extensions.cli = workspace.extensions.cli || {};

    const defaultCollection: string =
      workspace.extensions.cli && ((workspace.extensions.cli as JsonObject).defaultCollection as string);

    if (!defaultCollection || defaultCollection === "@nrwl/workspace") {
      (workspace.extensions.cli as JsonObject).defaultCollection = "@apployees-nx/webserver";
    }
  });
}

export default function (schema: Schema) {
  return chain([
    setDefault(),
    addPackageWithInit("@nrwl/jest"),
    addDependencies(),
    moveDependency(),
    formatFiles(schema),
  ]);
}
