import { existsSync, readFileSync } from "fs";
import createCertificateAndKeys from "./createCertificateAndKeys";

export interface KeyAndCertificate {
  key: string;
  certificate: string;
}

export default function getKeyAndCertificate(): KeyAndCertificate {
  const isHttps = process.env.HTTPS || env.HTTPS;
  if (isHttps === true || isHttps === "true") {
    const key = process.env.HTTPS_KEY || env.HTTPS_KEY;
    const cert = process.env.HTTPS_CERT || env.HTTPS_CERT;

    if (existsSync(key) && existsSync(cert)) {
      console.log(">>>> HERE IN FILE");
      // the key and certificate are provided as file paths
      return {
        key: readFileSync(process.env.HTTPS_KEY, "utf-8"),
        certificate: readFileSync(process.env.HTTPS_CERT, "utf-8"),
      };
    } else if (key && cert) {
      // the key and certificate are inlined from the builder...
      return {
        key: env.HTTPS_KEY,
        certificate: env.HTTPS_CERT
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
