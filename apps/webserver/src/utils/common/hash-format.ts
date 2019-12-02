/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
export interface IHashFormat {
  chunk: string;
  extract: string;
  file: string;
  script: string;
}

export function getOutputHashFormat(option: string, length = 20): IHashFormat {
  const hashFormats: { [option: string]: IHashFormat } = {
    none: { chunk: "", extract: "", file: "", script: "" },
    media: { chunk: "", extract: "", file: `.[hash:${length}]`, script: "" },
    bundles: {
      chunk: `.[chunkhash:${length}]`,
      extract: `.[contenthash:${length}]`,
      file: "",
      script: `.[hash:${length}]`,
    },
    all: {
      chunk: `.[chunkhash:${length}]`,
      extract: `.[contenthash:${length}]`,
      file: `.[hash:${length}]`,
      script: `.[hash:${length}]`,
    },
  };
  return hashFormats[option] || hashFormats["none"];
}
