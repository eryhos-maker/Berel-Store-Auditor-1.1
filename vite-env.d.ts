// Reference to vite/client removed to fix "Cannot find type definition file" error

interface ImportMetaEnv {
  readonly API_KEY: string
  readonly VITE_SHEETS_URL?: string
  readonly VITE_SHEETS_KEY?: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}