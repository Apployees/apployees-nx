/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import React from "react";
import { useState } from "react";

/**
 * Example of importing a library directly. This library will be bundled with
 * the app main module.
 */
import { library2 } from "@apployees-nx/examples/library2";

/**
 * You can import an image and it will either be inlined (if it's small enough)
 * or will be exported into the public folder. The javascript reference you
 * receive will either be the data URL (if inlined) or the path to the image in
 * the public folder. Note that the public folder will be prefixed with the
 * ASSETS_URL (so CDN will work).
 */
import logo from "./logo.svg";

/**
 * You can import CSS modules. All styles in a *.module.css file will be scoped
 * to that file only so you can use that style knowing that it's not global
 *
 * The javascript reference will give you a name that is unique to that style
 * in that css module file.
 *
 * Note also that all names in the file that have dashes will be converted to
 * camelCase. The case of the first character of the style name is preserved.
 */
import cssModuleStyles from "./styles/AppCss.module.css";

/**
 * When not using CSS modules, all styles will be global. There will be no
 * scoping and no conversion of names to camelcase.
 *
 * When you import a non-module style, you get an empty Javascript object because
 * nothing is scoped. Hence, there is no point in assigning it -- just import
 * the file and use the style names as strings (see component below).
 */
import "./styles/AppCss.css";

/**
 * Similar to CSS modules but using LESS modules instead.
 */
import lessModuleStyles from "./styles/AppLess.module.less";

/**
 * Non-module import of LESS. All styles will be global.
 */
import "./styles/AppLess.less";

/**
 * Similar to CSS modules but using Sass modules instead.
 */
import sassModuleStyles from "./styles/AppSass.module.sass";

/**
 * Non-module import of Sass. All styles will be global.
 */
import "./styles/AppSass.sass";

import { Button } from "antd";

/**
 * We'll declare a worker variable that we will use later on to load the
 * web worker.
 */
let webWorker;

/**
 * The App react component.
 *
 * @constructor
 */
export default function App() {
  const initialDynamicLibraryText = "Dynamic library loading...please wait!!";
  const [dynamicLibraryText, setDynamicLibraryText] = useState(initialDynamicLibraryText);
  const [webWorkerText, setWebWorkerText] = useState("Test Web Worker");

  const onLoadLibraryClick = onLoadLibraryClickFn(dynamicLibraryText, initialDynamicLibraryText, setDynamicLibraryText);
  const onWebWorkerTestClick = onWebWorkerTestClickFn(setWebWorkerText);

  return (
    <div className={cssModuleStyles.app}>
      <header className="app-header">
        <img src={logo} className={lessModuleStyles.AppLogo} alt="logo" />
        <p>
          Edit <code className="Path-Name">src/App.js</code> and save to reload!
        </p>
        <p className={sassModuleStyles.libraryText}>{library2()}</p>
        {dynamicLibraryText !== initialDynamicLibraryText && (
          <p className={sassModuleStyles.libraryText}>{dynamicLibraryText}</p>
        )}

        <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          Learn React
        </a>
        <Button
          onClick={onLoadLibraryClick}
          style={{ margin: 50 }}
          type="primary"
          disabled={dynamicLibraryText !== initialDynamicLibraryText}
        >
          Load a dynamic library.
        </Button>
        <Button onClick={onWebWorkerTestClick} style={{ margin: 50 }}>
          {webWorkerText}
        </Button>
      </header>
    </div>
  );
}
function onWebWorkerTestClickFn(setWebWorkerText) {
  return (event: React.MouseEvent) => {
    event.preventDefault();

    if (!webWorker) {
      /**
       * There are two ways to load your web worker:
       * 1. Using https://github.com/GoogleChromeLabs/worker-plugin
       * 2. Using https://github.com/webpack-contrib/worker-loader
       *
       * If using method 1, your worker ts file MUST NOT be named *.worker.ts
       *
       * If using method 2, your worker ts file MUST be named *.worker.js
       *
       * Note that method 1 currently DOES NOT work in development mode. See
       * https://github.com/GoogleChromeLabs/worker-plugin/issues/36
       */

      // This is method 1:
      webWorker = new Worker("./webWorker", { type: "module" });

      // This is method 2:
      // It uses inline web workers to overcome CORS problems in web workers.
      // const Worker = require("worker-loader?inline=true!./web.worker.ts");
      // webWorker = new Worker();

      // the rest of the code remains the same.
      webWorker.onmessage = event => {
        setWebWorkerText("Test Web Worker: last message received=" + event.data);
      };
    }

    webWorker.postMessage("Current date from main thread is " + new Date());
  };
}
function onLoadLibraryClickFn(dynamicLibraryText, initialDynamicLibraryText: string, setDynamicLibraryText) {
  return (event: React.MouseEvent) => {
    event.preventDefault();
    if (dynamicLibraryText === initialDynamicLibraryText) {
      /**
       * Example of a lazy-loaded library. This library will be bundled in a
       * separate chunk and downloaded on-demand when this code executes.
       */
      import("@apployees-nx/examples/library1").then(library1 => {
        setDynamicLibraryText(library1.library1());
      });
    }
  };
}
