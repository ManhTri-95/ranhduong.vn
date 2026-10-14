/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_MEDIA_BASE?: string;
  /** Style MapLibre cho bản đồ ghim; để trống thì dùng positron của OpenFreeMap. */
  readonly VITE_MAP_STYLE_URL?: string;
  /** Web khách (link "Xem trên web"); mặc định http://localhost:3100. */
  readonly VITE_WEB_BASE?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
