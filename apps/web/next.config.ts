import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  sw: "sw.js",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Évite des chunks manquants (ex. ./383.js) quand le cache disque Webpack/.next est désynchronisé en dev. */
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default withPWA(nextConfig);
