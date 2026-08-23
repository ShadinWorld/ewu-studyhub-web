import { BookOpen, Info, Plus, Archive, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { archiveGuideSection, archiveHelpItem, restoreHelpItem, upsertGuideSection, upsertHelpItem } from "./actions";

const labelClass = "text-xs font-semibold text-muted-foreground";
const fieldClass = "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const areaClass = `${fieldClass} min-h-24`;

function HelpEditForm({ item }: { item?: any }) {
  return <form action={upsertHelpItem} className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <div className="grid gap-3 md:grid-cols-2">
      <label><span className={labelClass}>Slug</span><Input name="slug" defaultValue={item?.slug ?? ""} required placeholder="resource_preview" /></label>
      <label><span className={labelClass}>Role scope</span><select name="role_scope" defaultValue={item?.role_scope ?? "general"} className={fieldClass}><option value="general">General</option><option value="student">Student</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
    </div>
    <label><span className={labelClass}>Title</span><Input name="title" defaultValue={item?.title ?? ""} required placeholder="Resource Preview কীভাবে কাজ করে" /></label>
    <label><span className={labelClass}>Intro / এটা কী?</span><textarea name="intro" defaultValue={item?.intro ?? ""} required className={areaClass} /></label>
    <label><span className={labelClass}>How to / কীভাবে ব্যবহার করবেন?</span><textarea name="how_to" defaultValue={item?.how_to ?? ""} className={areaClass} /></label>
    <label><span className={labelClass}>Benefits / কী benefit পাবেন?</span><textarea name="benefits" defaultValue={item?.benefits ?? ""} className={areaClass} /></label>
    <label><span className={labelClass}>Notes / কী খেয়াল রাখবেন?</span><textarea name="notes" defaultValue={item?.notes ?? ""} className={areaClass} /></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className={labelClass}>Status</span><select name="status" defaultValue={item?.status ?? "draft"} className={fieldClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <label><span className={labelClass}>Order</span><Input name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} /></label>
    </div>
    <div className="flex flex-wrap justify-end gap-2"><Button type="submit"><Plus className="mr-2 h-4 w-4" />{item ? "Save changes" : "Add Help"}</Button></div>
  </form>;
}

function GuideEditForm({ item }: { item?: any }) {
  return <form action={upsertGuideSection} className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <div className="grid gap-3 md:grid-cols-3">
      <label><span className={labelClass}>Slug</span><Input name="slug" defaultValue={item?.slug ?? ""} required placeholder="general-preview" /></label>
      <label><span className={labelClass}>Section group</span><select name="section_group" defaultValue={item?.section_group ?? "general"} className={fieldClass}><option value="general">General</option><option value="student">Student</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
      <label><span className={labelClass}>Required access</span><select name="required_access" defaultValue={item?.required_access ?? "none"} className={fieldClass}><option value="none">Everyone</option><option value="verified_student">Verified student</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
    </div>
    <label><span className={labelClass}>Title</span><Input name="title" defaultValue={item?.title ?? ""} required /></label>
    <label><span className={labelClass}>Summary</span><textarea name="summary" defaultValue={item?.summary ?? ""} required className={areaClass} /></label>
    <label><span className={labelClass}>What is this? / এটা কী?</span><textarea name="what_is" defaultValue={item?.what_is ?? ""} required className={areaClass} /></label>
    <label><span className={labelClass}>How to / কীভাবে ব্যবহার করবেন?</span><textarea name="how_to" defaultValue={item?.how_to ?? ""} className={areaClass} /></label>
    <label><span className={labelClass}>Benefits / কী benefit পাবেন?</span><textarea name="benefits" defaultValue={item?.benefits ?? ""} className={areaClass} /></label>
    <label><span className={labelClass}>Notes / কী খেয়াল রাখবেন?</span><textarea name="notes" defaultValue={item?.notes ?? ""} className={areaClass} /></label>
    <div className="grid gap-3 md:grid-cols-2">
      <label><span className={labelClass}>Action label</span><Input name="action_label" defaultValue={item?.action_label ?? ""} placeholder="Open Search" /></label>
      <label><span className={labelClass}>Action href</span><Input name="action_href" defaultValue={item?.action_href ?? ""} placeholder="/search" /></label>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <label><span className={labelClass}>Locked message</span><textarea name="locked_message" defaultValue={item?.locked_message ?? ""} className={areaClass} /></label>
      <label><span className={labelClass}>Locked action label</span><Input name="locked_action_label" defaultValue={item?.locked_action_label ?? ""} placeholder="Become a Seller" /></label>
      <label><span className={labelClass}>Locked action href</span><Input name="locked_action_href" defaultValue={item?.locked_action_href ?? ""} placeholder="/dashboard/become-seller" /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className={labelClass}>Status</span><select name="status" defaultValue={item?.status ?? "draft"} className={fieldClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <label><span className={labelClass}>Order</span><Input name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} /></label>
    </div>
    <div className="flex flex-wrap justify-end gap-2"><Button type="submit"><Plus className="mr-2 h-4 w-4" />{item ? "Save changes" : "Add Guide section"}</Button></div>
  </form>;
}

export default async function AdminHelpPage({ searchParams }: { searchParams: { saved?: string } }) {
  const supabase = createClient();
  const { data: helps } = await supabase.from("help_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  const { data: guide } = await supabase.from("guide_sections").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  return <div className="space-y-6">
    {searchParams.saved && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">{searchParams.saved}</div>}
    <section><p className="text-sm font-semibold text-primary">Content control</p><h2 className="text-2xl font-bold">Help & User Guide</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">এখান থেকে contextual Info/Help content এবং পুরো EWU StudyHub User Guide-এর section edit, add, publish, reorder ও archive করতে পারবেন। Hard delete করা হয় না; ভুল হলে archived item restore করে আবার Draft/Published করা যায়.</p></section>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Contextual Help</CardTitle></CardHeader><CardContent className="space-y-4"><HelpEditForm />{(helps ?? []).map((item) => <details key={item.id} className="rounded-2xl border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.title}</span><Badge variant="outline">{item.role_scope}</Badge><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.slug}</p></div></summary><div className="border-t p-3"><HelpEditForm item={item} /><div className="mt-3 flex flex-wrap justify-end gap-2">{item.status === "archived" ? <form action={restoreHelpItem}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Restore to draft</Button></form> : <form action={archiveHelpItem}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="outline"><Archive className="mr-2 h-4 w-4" />Archive</Button></form>}</div></div></details>)}</CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />User Guide sections</CardTitle></CardHeader><CardContent className="space-y-4"><GuideEditForm />{(guide ?? []).map((item) => <details key={item.id} className="rounded-2xl border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.title}</span><Badge variant="outline">{item.section_group}</Badge><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.slug} · access: {item.required_access}</p></div></summary><div className="border-t p-3"><GuideEditForm item={item} /><div className="mt-3 flex justify-end">{item.status !== "archived" && <form action={archiveGuideSection}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="outline"><Archive className="mr-2 h-4 w-4" />Archive</Button></form>}</div></div></details>)}</CardContent></Card>
    </div>
  </div>;
}
