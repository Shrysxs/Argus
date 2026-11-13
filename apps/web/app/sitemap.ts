import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/decisions", "/leaderboard", "/methodology", "/pricing", "/legal/terms", "/legal/privacy", "/legal/disclaimer"].map(
    (path) => ({ url: `${base}${path}`, changeFrequency: path === "/decisions" ? "hourly" : "weekly" }),
  );
}
