/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// Injected by Vite define – always mirrors package.json "version"
declare const __APP_VERSION__: string
