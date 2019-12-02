/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import fs from "fs";
import path from "path";

const htmlMiddleware = () => (req, res, next) => {
  const publicPath = path.join(__dirname, "/public", "app.html");

  fs.readFile(publicPath, "utf8", (err, html) => {
    if (!err) {
      req.html = html;
      next();
    } else {
      res.status(500).send("Error parsing index.html");
    }
  });
};

export default htmlMiddleware;
