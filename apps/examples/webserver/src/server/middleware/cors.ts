/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import express from "express";
import Url from "domurl";
import getServerEnvironmentVariable from "../serverEnvs";

export default function setupCors(app: express.Application): express.RequestHandler {
  const hostOrigin = normalizeToOrigin(`https://${getServerEnvironmentVariable("HOST")}`);
  const assetsUrlOrigin = normalizeToOrigin(getServerEnvironmentVariable("ASSETS_URL"));

  return (req, res, next) => {
    const origin = req.get("origin");
    if (origin === hostOrigin || origin === assetsUrlOrigin) {
      // allow cross domain between these two hosts
      res.set({
        "Access-Control-Allow-Origin": origin,
      });
    }

    next();
  };
}

function normalizeToOrigin(url: string): string {
  const origin = new Url(url);
  const serverHost = getServerEnvironmentVariable("HOST");
  origin.host = origin.host || serverHost;
  origin.path = "";
  origin.query = "";
  origin.hash = "";
  origin.user = "";
  origin.pass = "";

  const isHttps = getServerEnvironmentVariable("HTTPS", false);
  origin.protocol = isHttps === true || isHttps === "true" ? "https" : "http";

  if (origin.host === serverHost && !origin.port) {
    origin.port = env.PORT || "3000";
  }

  return origin.toString();
}
