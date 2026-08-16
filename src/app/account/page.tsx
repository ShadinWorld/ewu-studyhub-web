import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompleteAccountForm } from "@/components/account/complete-account-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileSettingsForm } from "@/components/account/profile-settings-form";

export default async function AccountPage({ searchParams }: { searchParams: { next?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, phone_number, role, university_email, university_email_verified, account_status, name_changed_at").eq("id", user.id).single();
  const next = searchParams.next || "/";
  const name = profile?.full_name || user.user_metadata?.full_name || "User";
  const initials = name.split(/\s+/).map((x: string) => x[0]).join("").slice(0, 2).toUpperCase();
  return <div className="container max-w-2xl py-10"><Card><CardHeader><div className="flex items-center gap-4"><Avatar className="h-16 w-16 border">{profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}<AvatarFallback>{initials}</AvatarFallback></Avatar><div><CardTitle>Account</CardTitle><p className="text-sm text-muted-foreground">Your Google account and StudyHub information.</p></div></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Full name</p><p className="mt-1 font-medium">{name}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Google email</p><p className="mt-1 break-all font-medium">{user.email || "—"}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Phone number</p><p className="mt-1 font-medium">{profile?.phone_number || "Required"}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">EWU email</p><p className="mt-1 break-all font-medium">{profile?.university_email || "Not verified"}</p></div></div><div className="mt-5 rounded-xl border p-5"><h2 className="font-semibold">Profile settings</h2><p className="mt-1 text-sm text-muted-foreground">Update your photo and name while keeping account identity controls safe.</p><div className="mt-5"><ProfileSettingsForm name={name} avatarUrl={profile?.avatar_url ?? null} nameChangedAt={profile?.name_changed_at ?? null} /></div></div>{profile?.account_status && profile.account_status !== "active" && <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">Your account is currently <strong>{profile.account_status}</strong>. Some actions may be limited.</div>}{!profile?.phone_number && <CompleteAccountForm next={next} />}</CardContent></Card></div>;
}
