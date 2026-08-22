"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, FileQuestion, Megaphone, MessageSquare, ShieldAlert, ShoppingBag, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markNotificationRead, markNotificationReadById } from "@/app/notifications/actions";
import { useRouter } from "next/navigation";

type NotificationItem={id:string;type:string;title:string;body:string|null;link:string|null;is_read:boolean;created_at:string};
const filters=["all","unread","requests","system"] as const;

function category(type:string){
  if(["upload_pending","upload_approved","upload_rejected","payout_pending","payout_completed","payout_requested","seller_approved","seller_rejected","seller_verification_pending","purchase_pending","purchase_completed","purchase_approved","purchase_rejected"].includes(type)) return "requests";
  if(["purchase_completed","purchase_pending","purchase_approved","purchase_rejected"].includes(type)) return "marketplace";
  if(["payout_completed","payout_requested","payout_pending","payment_submitted","seller_approved","seller_rejected","seller_verification_pending","upload_pending","upload_approved","upload_rejected"].includes(type)) return "seller";
  return "system";
}

function statusTone(type:string){
  if(type.includes("rejected") || type === "report_update") return { card:"border-red-300/70 bg-red-500/[0.045]", icon:"bg-red-500/10 text-red-600 dark:text-red-300", label:"Rejected", badge:"bg-red-600 text-white" };
  if(type.includes("pending") || type === "seller_verification_pending" || type === "payment_submitted") return { card:"border-amber-300/70 bg-amber-500/[0.055]", icon:"bg-amber-500/10 text-amber-700 dark:text-amber-300", label:"Pending", badge:"bg-amber-500 text-white" };
  if(type.includes("approved") || type.includes("completed") || type === "seller_approved") return { card:"border-emerald-300/70 bg-emerald-500/[0.045]", icon:"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", label:"Approved", badge:"bg-emerald-600 text-white" };
  return { card:"border-border bg-card", icon:"bg-muted/70 text-primary", label:"Info", badge:"bg-primary text-primary-foreground" };
}

function icon(type:string){
  const tone=statusTone(type).icon;
  const cls=`h-5 w-5 ${tone.includes("red")?"text-red-600":tone.includes("amber")?"text-amber-600":tone.includes("emerald")?"text-emerald-600":"text-primary"}`;
  if(type.includes("purchase")) return <ShoppingBag className={cls}/>;
  if(type.includes("payout")) return <WalletCards className={cls}/>;
  if(type === "upload_pending" || type === "seller_verification_pending") return <Clock3 className={cls}/>;
  if(type.includes("deadline")) return <CalendarClock className={cls}/>;
  if(type.includes("resource_request")) return <FileQuestion className={cls}/>;
  if(type.includes("announcement")) return <Megaphone className={cls}/>;
  if(type.includes("admin_message")) return <MessageSquare className={cls}/>;
  if(type.includes("rejected")||type==="report_update") return <XCircle className={cls}/>;
  if(type.includes("approved")||type.includes("completed")) return <CheckCircle2 className={cls}/>;
  return <Clock3 className={cls}/>;
}

function NotificationOpenButton({ notificationId, link }: { notificationId: string; link: string }) {
  const router = useRouter();
  return <Button type="button" size="sm" variant="outline" onClick={() => { void markNotificationReadById(notificationId).then(() => router.push(link)).catch(() => router.push(link)); }}>Open</Button>;
}

export function NotificationList({notifications}:{notifications:NotificationItem[]}){
  const [filter,setFilter]=useState<typeof filters[number]>("all");
  const visible=useMemo(()=>notifications.filter(n=>filter==="all"||(filter==="unread"&&!n.is_read)||category(n.type)===filter),[filter,notifications]);
  const statusItems=notifications.filter(n=>["upload_pending","upload_approved","upload_rejected","payout_pending","payout_completed","seller_verification_pending","seller_approved","seller_rejected","purchase_pending","purchase_completed","report_update"].includes(n.type)).slice(0,8);
  return <div className="mt-6">
    {statusItems.length>0&&<section className="mb-6 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Action status</p><h2 className="mt-1 text-lg font-bold">Requests and pending actions</h2><p className="mt-1 text-sm text-muted-foreground">Green = approved, yellow = pending, red = rejected.</p></div></div><div className="mt-4 space-y-3">{statusItems.map(n=>{const tone=statusTone(n.type);return <Card key={`status-${n.id}`} className={tone.card}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.icon}`}>{icon(n.type)}</span><p className="font-semibold">{n.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>{tone.label}</span></div><p className="mt-2 text-sm text-muted-foreground">{n.body || "Status update."}</p><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(n.created_at).toLocaleString()}</p></div>{n.link&&<NotificationOpenButton notificationId={n.id} link={n.link} />}</CardContent></Card>})}</div></section>}
    <div className="flex flex-wrap gap-2 pb-2">{filters.map(f=><button key={f} type="button" onClick={()=>setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${filter===f?"border-primary bg-primary/10 text-primary":"hover:bg-accent"}`}>{f}</button>)}</div>
    <div className="mt-4 space-y-3">{visible.length?visible.map(n=>{const tone=statusTone(n.type);return <Card key={n.id} className={`${tone.card} ${!n.is_read?"ring-1 ring-primary/20":""}`}><CardContent className="flex gap-3 p-4 sm:gap-4"><div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>{icon(n.type)}</div><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold leading-5">{n.title}</p>{tone.label!=="Info"&&<span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${tone.badge}`}>{tone.label}</span>}</div><p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></div>{!n.is_read&&<span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread"/>}</div>{n.body&&<p className="mt-2 text-sm leading-6 text-muted-foreground">{n.body}</p>}<div className="mt-3 flex flex-wrap gap-2">{n.link&&<NotificationOpenButton notificationId={n.id} link={n.link} />}{!n.is_read&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={n.id}/><Button type="submit" size="sm" variant="ghost">Mark as read</Button></form>}</div></div></CardContent></Card>}) : <Card><CardContent className="flex flex-col items-center p-10 text-center"><ShieldAlert className="h-7 w-7 text-muted-foreground"/><p className="mt-3 font-medium">Nothing here</p><p className="mt-1 text-sm text-muted-foreground">Try another notification filter.</p></CardContent></Card>}</div>
  </div>
}
