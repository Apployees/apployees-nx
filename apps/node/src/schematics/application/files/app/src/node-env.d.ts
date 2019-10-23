/// <reference types="node" />

declare const process: {
  env: {
    NODE_ENV: "production" | "development" | string;
  }
};

declare const env: any;
