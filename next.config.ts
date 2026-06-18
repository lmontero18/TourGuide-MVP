import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Permite servir assets de dev (_next/*, HMR) cuando se accede via tunel (ngrok)
  // y no solo desde localhost. Necesario para probar el Embedded Signup por HTTPS.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io"],
};

export default withNextIntl(nextConfig);
