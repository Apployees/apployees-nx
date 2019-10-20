import { BuilderContext } from '@angular-devkit/architect';
import { workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { ProjectNode } from '@nrwl/workspace/src/command-line/affected-apps';
import { appRootPath } from '@nrwl/workspace/src/utils/app-root';
import { fileExists } from '@nrwl/workspace/src/utils/fileutils';
import { readJsonFile } from '@angular-devkit/schematics/tools/file-system-utility';
import { IPackageJson } from '../generate-package-json/all-deps-calculator';

export async function getSourceRoot(context: BuilderContext) {
  const workspaceHost = workspaces.createWorkspaceHost(new NodeJsSyncHost());
  const { workspace } = await workspaces.readWorkspace(
    context.workspaceRoot,
    workspaceHost
  );
  if (workspace.projects.get(context.target.project).sourceRoot) {
    return workspace.projects.get(context.target.project).sourceRoot;
  } else {
    context.reportStatus('Error');
    const message = `${context.target.project} does not have a sourceRoot. Please define one.`;
    context.logger.error(message);
    throw new Error(message);
  }
}

export function readRootPackageJson(projectNode: ProjectNode): IPackageJson {
  const rootPackageJsonPath = `${appRootPath}/package.json`;
  const rootPackageJson: IPackageJson =
    fileExists(rootPackageJsonPath) ? readJsonFile(rootPackageJsonPath) as IPackageJson :
      {};

  return rootPackageJson;
}
