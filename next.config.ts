import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Los posts del blog viven como .mdx en el repo (app/blog/posts/)
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Permite servir assets de dev (_next/*, HMR) cuando se accede via tunel (ngrok)
  // y no solo desde localhost. Necesario para probar el Embedded Signup por HTTPS.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io"],
};

const withMDX = createMDX({
  options: {
    // Turbopack: los plugins van por nombre (string), no como funcion importada
    remarkPlugins: [["remark-frontmatter", { type: "yaml", marker: "-" }]],
  },
});

// Sentry: source maps + tunnel. Con Turbopack las opciones webpack-only se
// ignoran — no agregar widenClientFileUpload ni transforms.
// El upload de source maps solo corre si SENTRY_AUTH_TOKEN esta seteado
// (build de Vercel); en local el build pasa sin subir nada.
export default withSentryConfig(withNextIntl(withMDX(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Proxy propio para eventos del browser — evita que ad-blockers corten
  // el reporte de errores del dashboard.
  tunnelRoute: "/sentry-tunnel",
});
