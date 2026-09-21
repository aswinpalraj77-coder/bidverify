/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Tesseract.js loads its worker/core files at runtime; keep them external
    // to webpack's bundling so the .wasm/.worker files resolve correctly.
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
