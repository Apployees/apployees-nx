import { join } from "path";
import { SchematicTestRunner } from "@angular-devkit/schematics/testing";

export const nodeTestRunner = new SchematicTestRunner(
  '@apployees-nx/node',
  join(__dirname, './__tests__/collection.json')
);

