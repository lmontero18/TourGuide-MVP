import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

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

export default withNextIntl(withMDX(nextConfig));
