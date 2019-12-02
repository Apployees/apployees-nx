/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import _ from "lodash";

// require assignment using a package that is not directly added in the root package.json
import cookie from "cookie";

// just a require call
require("typescript");

// library import that is externalized and not bundled.
// it is expected that this library would be published independently.
// See the externalLibraries field in angular.json file
import { library2 } from "@apployees-nx/examples/library2";

interface ISomeInterfaceToTryToThrowLineNumbersOff {
  x: string;
  y: number;
}

function isValidVersion(version: string) {
  // lazy loaded node_module
  import("semver").then(semver => {
    console.log(`semver ${version} is valid?? ${!!semver.valid(version)}`);
  });
}

function importLibraries() {
  // lazy loaded library
  import("@apployees-nx/examples/library1").then(library1 => {
    console.log(library2());
    console.log(library1.library1());
  });
}

importLibraries();

isValidVersion("1.2.3");

/**
 * Note that your environment variables from all those environment files from
 * build time are actually available under env.XYZ. If you want to override these
 * at runtime from the runtime ones, do:
 *
 * process.env.myVar || env.myVar
 *
 * This will favour myVar in process.env over what is compiled. Remember that
 * at build time, env.myVar will actually be substituted with the literal from
 * the .env files. So the above code will actually look like:
 *
 * process.env.myVar || "someValueOfMyVar"
 */
console.log("env:");
console.log(JSON.stringify(env, null, 2));
console.log(`ENV_X=${env.ENV_X}`);
console.log(`ENV_ANY=${env.ENV_ANY}`);
console.log(`ENV_DEV=${env.ENV_DEV}`);
console.log(`ENV_LOCAL_ANY=${env.ENV_LOCAL_ANY}`);
console.log(`ENV_LOCAL_DEV=${env.ENV_LOCAL_DEV}`);
console.log(`ENV_LOCAL_PROD=${env.ENV_LOCAL_PROD}`);
console.log(`ENV_LOCAL_TEST=${env.ENV_LOCAL_TEST}`);
console.log(`ENV_PROD=${env.ENV_PROD}`);
console.log(`ENV_TEST=${env.ENV_TEST}`);
