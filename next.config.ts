import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  async rewrites() {
    // Local dev: proxy the Garmin Python service (uvicorn) so the browser never needs to know about it.
    // On Vercel, vercel.json routes /api/py/* to the Python function instead.
    if (process.env.NODE_ENV === "development") {
      return [{ source: "/api/py/:path*", destination: "http://127.0.0.1:8000/api/py/:path*" }];
    }
    return [];
  },
};

export default nextConfig;
