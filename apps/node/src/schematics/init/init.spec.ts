/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { Tree } from "@angular-devkit/schematics";
import { createEmptyWorkspace } from "@nrwl/workspace/testing";
import { readJsonInTree, updateJsonInTree } from "@nrwl/workspace";
import { nodeTestRunner } from "../../utils/node-test-runner";
import { callRule, runSchematic } from "@apployees-nx/common-build-utils";

describe("init", () => {
  let tree: Tree;

  beforeEach(() => {
    tree = Tree.empty();
    tree = createEmptyWorkspace(tree);
  });

  it("should add dependencies", async () => {
    const result = await runSchematic(nodeTestRunner, "init", {}, tree);
    const packageJson = readJsonInTree(result, "package.json");
    expect(packageJson.dependencies["@apployees-nx/node"]).toBeUndefined();
    expect(packageJson.devDependencies["@apployees-nx/node"]).toBeDefined();
  });

  describe("defaultCollection", () => {
    it("should be set if none was set before", async () => {
      const result = await runSchematic(nodeTestRunner, "init", {}, tree);
      const workspaceJson = readJsonInTree(result, "workspace.json");
      expect(workspaceJson.cli.defaultCollection).toEqual("@apployees-nx/node");
    });

    it("should be set if @nrwl/workspace was set before", async () => {
      // eslint-disable-next-line require-atomic-updates
      tree = await callRule(
        nodeTestRunner,
        updateJsonInTree("workspace.json", json => {
          json.cli = {
            defaultCollection: "@nrwl/workspace",
          };

          return json;
        }),
        tree,
      );
      const result = await runSchematic(nodeTestRunner, "init", {}, tree);
      const workspaceJson = readJsonInTree(result, "workspace.json");
      expect(workspaceJson.cli.defaultCollection).toEqual("@apployees-nx/node");
    });

    it("should not be set if something else was set before", async () => {
      // eslint-disable-next-line require-atomic-updates
      tree = await callRule(
        nodeTestRunner,
        updateJsonInTree("workspace.json", json => {
          json.cli = {
            defaultCollection: "@nrwl/angular",
          };

          return json;
        }),
        tree,
      );
      const result = await runSchematic(nodeTestRunner, "init", {}, tree);
      const workspaceJson = readJsonInTree(result, "workspace.json");
      expect(workspaceJson.cli.defaultCollection).toEqual("@nrwl/angular");
    });
  });
});
