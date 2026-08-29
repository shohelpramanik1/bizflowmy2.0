import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bizflowmy.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/admin/", "/api/", "/d/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
