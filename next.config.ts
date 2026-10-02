import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard/income", destination: "/dashboard/transactions?type=income", permanent: false },
      { source: "/dashboard/expenses", destination: "/dashboard/transactions?type=expense", permanent: false },
    ];
  },
};

export default nextConfig;
