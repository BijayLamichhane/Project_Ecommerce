/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the API server, e.g. "https://api.renthub.app". Leave unset
   *  in development so requests stay relative and go through Vite's dev
   *  proxy (see vite.config.ts). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
