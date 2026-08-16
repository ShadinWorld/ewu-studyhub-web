"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  ["/admin", "Overview"], ["/admin/uploads", "Pending Uploads"], ["/admin/sellers", "Seller Requests"],
  ["/admin/payments", "Payments"], ["/admin/payouts", "Payouts"], ["/admin/reports", "Reports"],
  ["/admin/support", "Feedback & Support"], ["/admin/faqs", "FAQs"], ["/admin/users", "Users"],
  ["/admin/resources", "Resources"], ["/admin/academic-tools", "Academic Tools"], ["/admin/storage", "Storage"], ["/admin/commission", "Commission"], ["/admin/settings", "Settings"],
] as const;
export function MobileAdminMenu(){
 const [open,setOpen]=useState(false); const pathname=usePathname();
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{ if(!open)return; const onKey=(e:KeyboardEvent)=>e.key==="Escape"&&setOpen(false); document.addEventListener("keydown",onKey); return()=>document.removeEventListener("keydown",onKey);},[open]);
 return <div className="lg:hidden"><button type="button" aria-label={open?"Close admin menu":"Open admin menu"} onClick={()=>setOpen(v=>!v)} className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">{open?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button>{open&&<><button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/30" onClick={()=>setOpen(false)}/><div className="absolute left-3 top-12 z-50 w-[min(300px,calc(100vw-24px))] rounded-2xl border bg-background p-2 shadow-2xl">{links.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${pathname===href?"bg-primary/10 text-primary":"hover:bg-accent"}`}>{label}</Link>)}</div></>}</div>;
}
