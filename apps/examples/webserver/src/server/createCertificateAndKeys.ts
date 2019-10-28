import selfsigned from "selfsigned";
import getServerEnvironmentVariable from "./serverEnvs";

export default function createCertificateAndKeys() {

  let hostName = getServerEnvironmentVariable("HOST");
  if (hostName !== "localhost") {
    // convert to a wildcard certificate in case dev needs it.
    hostName = "*." + hostName;
  }

  const attrs = [{ name: 'commonName', value: hostName }];

  return selfsigned.generate(attrs, {
    algorithm: "sha256",
    days: 365,
    keySize: 2048,
    extensions: [
      {
        name: "basicConstraints",
        cA: true
      },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: "extKeyUsage",
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        timeStamping: true
      },
      {
        name: "subjectAltName",
        altNames: [
          {
            // type 2 is DNS
            type: 2,
            value: "localhost"
          },
          {
            type: 2,
            value: "localhost.localdomain"
          },
          env.HOST && {
            type: 2,
            value: env.HOST
          },
          env.HOST && env.HOST !== "localhost" && {
            type: 2,
            value: "*." + env.HOST
          },
          {
            type: 2,
            value: "[::1]"
          },
          {
            // type 7 is IP
            type: 7,
            ip: "127.0.0.1"
          },
          {
            type: 7,
            ip: "fe80::1"
          }
        ].filter(Boolean)
      }
    ]
  });
}
