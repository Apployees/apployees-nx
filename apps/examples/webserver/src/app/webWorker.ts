/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { expose } from "threads";

expose({
  echo: function echo(message) {
    console.log(`webWorker.ts received a message: ${message}`);
    return `Echo back: ${message}`;
  },
});
