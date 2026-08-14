import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/admin`, request.url));
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { data: file } = await supabase.from("files").select("id, storage_path").eq("id", params.id).single();
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const { data: signed, error } = await createAdminClient().storage.from("files-private").createSignedUrl(file.storage_path, 300);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
