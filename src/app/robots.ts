import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://ewu-studyhub-web.vercel.app";
  return { rules: [{ userAgent: "*", allow: ["/", "/courses", "/departments", "/files"], disallow: ["/admin", "/dashboard", "/account", "/checkout", "/api", "/notifications", "/requests", "/purchases"] }], sitemap: `${base}/sitemap.xml` };
}
