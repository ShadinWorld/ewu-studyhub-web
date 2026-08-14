import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
export default async function AccountPage() {
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login?next=/account");
  const {data:profile}=await supabase.from("profiles").select("full_name, phone_number, university_email, student_id, role, is_seller, seller_bkash_number, created_at").eq("id",user.id).single();
  const role=profile?.role==="admin"||profile?.role==="super_admin"?"Admin":profile?.is_seller||profile?.role==="seller"?"Seller":"Student";
  return <div className="flex min-h-screen flex-col"><Navbar/><main className="container flex-1 py-8 sm:py-10"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Account</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Your account information</h1><p className="mt-2 text-sm text-muted-foreground">Your login email and phone number are shown here.</p></div><Card className="mt-6 max-w-2xl"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{profile?.full_name||"EWU Student"}</CardTitle><Badge>{role}</Badge></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Info label="Email" value={user.email||"Not available"}/><Info label="Phone number" value={profile?.phone_number||"Not added yet"}/><Info label="EWU email" value={profile?.university_email||"Not verified"}/><Info label="Student ID" value={profile?.student_id||"Not added"}/><Info label="Seller status" value={profile?.is_seller?"Verified seller":"Student account"}/><Info label="Account created" value={profile?.created_at?new Date(profile.created_at).toLocaleDateString("en-BD"):"—"}/>{profile?.seller_bkash_number&&<Info label="Seller bKash" value={profile.seller_bkash_number}/>}</CardContent></Card></main><Footer/></div>;
}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>}
