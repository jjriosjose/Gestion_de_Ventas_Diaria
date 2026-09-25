/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_QA_URL?: string
  readonly VITE_SUPABASE_QA_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
