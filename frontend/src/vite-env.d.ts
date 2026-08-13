/// <reference types="vite/client" />

// Typed CSS Modules (class-name maps).
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
