/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { join } from "path";
import { SchematicTestRunner } from "@angular-devkit/schematics/testing";

export const webserverTestRunner = new SchematicTestRunner(
  "@apployees-nx/webserver",
  join(__dirname, "./__tests__/collection.json"),
);
