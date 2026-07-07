import type { MDXComponents } from "mdx/types";

// Requerido por @next/mdx con App Router. Los estilos de tipografia los pone
// el wrapper `prose` en app/blog/[slug]/page.tsx; aca solo overrides puntuales.
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
