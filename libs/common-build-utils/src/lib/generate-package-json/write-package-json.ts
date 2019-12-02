import { output, readNxJson, readWorkspaceJson } from "@nrwl/workspace";
import { getProjectNodes } from "@nrwl/workspace/src/command-line/shared";
import { BuilderContext } from "@angular-devkit/architect";
import { BuildBuilderOptions, ExternalDependencies } from "../types/common-types";
import * as _ from "lodash";
import { doWritePackageJson } from "./all-deps-calculator";

export function writePackageJson(
  options: BuildBuilderOptions,
  context: BuilderContext,
  externalDependencies: ExternalDependencies,
  externalLibraries: ExternalDependencies
): void {
  const workspaceJson = readWorkspaceJson();
  const nxJson = readNxJson();
  const projectNodes = getProjectNodes(workspaceJson, nxJson);

  const projectNode = _.find(projectNodes, node => node.name === context.target.project);

  if (!projectNode) {
    output.warn({
      title: `Cannot generate package.json -> no project with ${context.target.project} found`,
      slug: "generate-package-json:no-project",
      bodyLines: [`Cannot generate package.json -> no project with ${context.target.project} found`]
    });

    return;
  }

  doWritePackageJson(nxJson.npmScope, projectNode, projectNodes, context, externalDependencies, externalLibraries);
}

