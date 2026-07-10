import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "s.yimg.com" },
      { protocol: "https", hostname: "media.zenfs.com" },
      { protocol: "https", hostname: "l.yimg.com" },
      { protocol: "https", hostname: "ichef.bbci.co.uk" },
      { protocol: "https", hostname: "static01.nyt.com" },
      { protocol: "https", hostname: "static02.nyt.com" },
      { protocol: "https", hostname: "images.wsj.net" },
      { protocol: "https", hostname: "media.static-ebusiness.com" },
      { protocol: "https", hostname: "www.ft.com" },
      { protocol: "https", hostname: "www.economist.com" },
      { protocol: "https", hostname: "www.antena3.com" },
    ],
  },
};

export default nextConfig;
