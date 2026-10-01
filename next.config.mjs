/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Cross-origin isolation: required for SharedArrayBuffer, which the
        // Pyodide Web Worker uses to block on user input from the terminal
        // panel. All CDN assets (jsdelivr: Pyodide + Monaco) are served with
        // Cross-Origin-Resource-Policy, so require-corp does not break them.
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
