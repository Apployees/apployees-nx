/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import React from "react";
import ReactDOM from "react-dom";
import * as serviceWorker from "./serviceWorker";

import "./index.css";
import { clientOnly } from "./clientOnly";

let App = require("../app/App").default;

function render() {
  ReactDOM.hydrate(<App />, document.getElementById("root"));
}

clientOnly();
render();

if ((module as any).hot) {
  (module as any).hot.accept("../app/App", () => {
    console.log("Client reloading...");

    try {
      App = require("../app/App").default;
      render();
    } catch (error) {
      console.log(error);
    }
  });
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
