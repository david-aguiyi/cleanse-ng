/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // CI runs `next lint` as its own gate (see blueprint §17.3).
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    // Serve the carried-over static marketing/SEO pages (public/*.html) at clean,
    // extension-less URLs. Runs AFTER app routes, so /book, /admin, /cleaner,
    // /booking/*, /api/* always win; only unmatched single-segment paths (the
    // article slugs like /blog, /jericho-house-cleaning) fall through here.
    return {
      // Serve the static marketing homepage at "/". On Vercel the public .html
      // files serve only at their clean URL (via the /:slug rewrite below), not
      // at the .html path, so point "/" at the clean "/home" which then resolves
      // to public/home.html.
      beforeFiles: [{ source: "/", destination: "/home" }],
      afterFiles: [{ source: "/:slug", destination: "/:slug.html" }],
    };
  },
};

export default nextConfig;
