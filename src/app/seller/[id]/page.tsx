import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, BookOpen, CheckCircle2, Star, TrendingUp, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";
import type { FilePricingType } from "@/types/database.types";
import { CopyButton } from "@/components/shared/copy-button";

export default async function SellerProfilePage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: seller } = await admin.from("profiles").select("id, full_name, avatar_url, seller_bio, university_email_verified, student_id_verification_status").eq("id", params.id).maybeSingle();
  if (!seller) notFound();
  const { data: sellerPayment } = await admin.from("seller_payment_settings").select("bkash_number").eq("seller_id", seller.id).maybeSingle();
  const isOwnProfile = Boolean(user && user.id === seller.id);
  const maskedBkash = sellerPayment?.bkash_number ? sellerPayment.bkash_number.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") : null;

  const { data: files } = await admin.from("files").select("id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, seller_id").eq("seller_id", seller.id).eq("visibility", "published").order("downloads_count", { ascending: false }).limit(40);
  const ids = (files ?? []).map((f) => f.id);
  const [{ data: reviews }, { count: sales }] = await Promise.all([
    ids.length ? admin.from("reviews").select("rating").in("file_id", ids) : Promise.resolve({ data: [] as { rating: number }[] }),
    ids.length ? admin.from("purchases").select("id", { count: "exact", head: true }).in("file_id", ids).eq("status", "completed") : Promise.resolve({ count: 0 }),
  ]);
  const reviewRows = reviews ?? [];
  const rating = reviewRows.length ? reviewRows.reduce((sum, r) => sum + Number(r.rating), 0) / reviewRows.length : 0;
  const verified = seller.student_id_verification_status === "verified" || seller.university_email_verified;
  const cards: ResourceCardData[] = (files ?? []).map((file: any) => ({ id: file.id, title: file.title, thumbnail_url: file.thumbnail_url, file_kind: file.file_kind, pricing_type: file.pricing_type as FilePricingType, price_cents: file.price_cents, average_rating: Number(file.average_rating ?? 0), reviews_count: file.reviews_count ?? 0, downloads_count: file.downloads_count ?? 0, views_count: file.views_count ?? 0, category: file.category, seller_name: seller.full_name }));

  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container flex-1 py-8 sm:py-12"><section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4">{seller.avatar_url ? <Image src={seller.avatar_url} alt="" width={80} height={80} className="h-20 w-20 rounded-full border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><UserRound className="h-8 w-8 text-muted-foreground" /></div>}<div><p className="text-xs font-semibold uppercase tracking-wide text-primary">EWU StudyHub seller</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl">{seller.full_name || "EWU Seller"}{verified && <BadgeCheck className="h-6 w-6 text-primary" />}</h1><div className="mt-2 flex flex-wrap gap-2">{verified && <Badge variant="outline"><CheckCircle2 className="mr-1 h-3.5 w-3.5 text-primary" />Verified EWU seller</Badge>}{reviewRows.length > 0 && <Badge variant="outline"><Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-400" />{rating.toFixed(1)} seller rating</Badge>}</div></div></div><div className="grid grid-cols-3 gap-2 sm:min-w-[360px]"><div className="rounded-xl bg-muted/40 p-4 text-center"><BookOpen className="mx-auto h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{files?.length ?? 0}</p><p className="text-xs text-muted-foreground">Resources</p></div><div className="rounded-xl bg-muted/40 p-4 text-center"><TrendingUp className="mx-auto h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{sales ?? 0}</p><p className="text-xs text-muted-foreground">Sales</p></div><div className="rounded-xl bg-muted/40 p-4 text-center"><Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" /><p className="mt-2 text-xl font-bold">{reviewRows.length ? rating.toFixed(1) : "—"}</p><p className="text-xs text-muted-foreground">Rating</p></div></div></div>{sellerPayment?.bkash_number && <div className="mt-5 rounded-xl border bg-muted/20 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Seller bKash for payouts</p><div className="mt-2 flex items-center gap-2 text-sm font-medium"><span>{isOwnProfile ? sellerPayment.bkash_number : maskedBkash}</span>{isOwnProfile && <CopyButton value={sellerPayment.bkash_number} label="Copy number" />}</div><p className="mt-1 text-xs text-muted-foreground">Visible as masked information publicly; your full number is available on your private payment settings.</p></div>}{seller.seller_bio && <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{seller.seller_bio}</p>}</section><section className="mt-10"><div><p className="text-sm font-semibold text-primary">Published resources</p><h2 className="mt-1 text-2xl font-bold">Resources by {seller.full_name || "this seller"}</h2><p className="mt-1 text-sm text-muted-foreground">Browse this seller's published EWU StudyHub resources.</p></div><div className="mt-5"><ResourceCardGrid files={cards} /></div></section><div className="mt-8"><Link href="/courses" className="text-sm font-semibold text-primary hover:underline">Browse more courses →</Link></div></main><Footer /></div>;
}
