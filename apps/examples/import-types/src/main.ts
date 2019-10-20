// es6 style imports
import * as _ from "lodash";

// require assignment using a package that is not directly added in the root package.json
import * as cookie from "cookie";

// just a require call
require("typescript");

// library import that is externalized and not bundled.
// it is expected that this library would be published independently.
// See the externalLibraries field in angular.json file
import {library2} from "@apployees-nx/examples/library2";

interface SomeInterfaceToTryToThrowLineNumbersOff {
  x: string;
  y: number;
}

function isValidVersion(version: string) {
  // lazy loaded node_module
  import("semver")
    .then(semver => {
      console.log(`semver ${version} is valid?? ${!!semver.valid(version)}`);
    });
}

function importLibraries() {
  // lazy loaded library
  import("@apployees-nx/examples/library1")
    .then(library1 => {
      console.log(library2());
      console.log(library1.library1());
    })
}

importLibraries();

isValidVersion("1.2.3");
throw "err";
