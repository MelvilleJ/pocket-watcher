import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["imapflow", "mailparser", "web-push"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  allowedDevOrigins: ["192.168.100.226", "192.168.100.234", "*.ngrok-free.dev", "*.ngrok-free.app"],
  async redirects() {
    return [
      { source: "/dashboard/income", destination: "/dashboard/transactions?type=income", permanent: false },
      { source: "/dashboard/expenses", destination: "/dashboard/transactions?type=expense", permanent: false },
    ];
  },
};

export default nextConfig;
