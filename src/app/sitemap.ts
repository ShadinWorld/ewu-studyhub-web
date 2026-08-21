import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://ewu-studyhub-web.vercel.app";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const [{ data: departments }, { data: courses }, { data: resources }] = await Promise.all([
    supabase.from("departments").select("id,created_at"),
    supabase.from("courses").select("id,created_at"),
    supabase.from("files").select("id,updated_at").eq("visibility","published").limit(5000),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/departments`, changeFrequency: "weekly", priority: 0.8 },
    ...((departments ?? []).map(d => ({ url: `${base}/departments/${d.id}`, lastModified: d.created_at, changeFrequency: "weekly" as const, priority: 0.7 }))),
    ...((courses ?? []).map(c => ({ url: `${base}/course/${c.id}`, lastModified: c.created_at, changeFrequency: "weekly" as const, priority: 0.7 }))),
    ...((resources ?? []).map(r => ({ url: `${base}/files/${r.id}`, lastModified: r.updated_at, changeFrequency: "weekly" as const, priority: 0.6 }))),
  ];
}
