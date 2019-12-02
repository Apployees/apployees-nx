/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { existsSync, readFileSync } from "fs";
import createCertificateAndKeys from "./createCertificateAndKeys";
import getServerEnvironmentVariable from "./serverEnvs";

export interface IKeyAndCertificate {
  key: string;
  certificate: string;
}

export default function getKeyAndCertificate(): IKeyAndCertificate {
  const isHttps = getServerEnvironmentVariable("HTTPS", false);
  if (isHttps === true || isHttps === "true") {
    const key = getServerEnvironmentVariable("HTTPS_KEY");
    const cert = getServerEnvironmentVariable("HTTPS_CERT");

    if (existsSync(key) && existsSync(cert)) {
      // the key and certificate are provided as file paths
      return {
        key: readFileSync(key, "utf-8"),
        certificate: readFileSync(cert, "utf-8"),
      };
    } else if (key && cert) {
      // the key and certificate are inlined from the builder...
      return {
        key: key,
        certificate: cert,
      };
    } else {
      // generate one
      const pems = createCertificateAndKeys();
      return {
        key: pems.private,
        certificate: pems.cert,
      };
    }
  } else {
    return null;
  }
}
