"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileSettingsForm({ name, avatarUrl, nameChangedAt }: { name: string; avatarUrl: string | null; nameChangedAt: string | null }) {
 const [fullName,setFullName]=useState(name); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const inputRef=useRef<HTMLInputElement>(null);
 const supabase=createClient();
 const canChangeName=!nameChangedAt || new Date(nameChangedAt).getTime() <= Date.now()-30*24*60*60*1000;
 async function saveName(){setSaving(true);const {data,error}=await supabase.rpc("change_profile_name",{p_full_name:fullName.trim()});setSaving(false);if(error){toast.error(error.message);return;}toast.success("Name updated. You can change it again after 30 days.");window.location.reload();}
 async function uploadAvatar(file:File){if(!file.type.startsWith("image/")){toast.error("Please choose an image.");return;}if(file.size>5*1024*1024){toast.error("Profile photo must be 5 MB or smaller.");return;}setUploading(true);const ext=(file.name.split(".").pop()||"jpg").toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;const {error:uploadError}=await supabase.storage.from("avatars").upload(path,file,{contentType:file.type,upsert:false});if(uploadError){setUploading(false);toast.error(uploadError.message);return;}const {data}=supabase.storage.from("avatars").getPublicUrl(path);const {error}=await supabase.rpc("update_profile_avatar",{p_avatar_url:data.publicUrl});setUploading(false);if(error){toast.error(error.message);return;}toast.success("Profile photo updated.");window.location.reload();}
 return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Profile photo</p><p className="text-xs text-muted-foreground">Use a clear photo. Maximum 5 MB.</p></div><Button type="button" variant="outline" disabled={uploading} onClick={()=>inputRef.current?.click()}>{uploading?"Uploading…":"Change photo"}</Button><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadAvatar(f);}} /></div><div className="space-y-2"><label className="text-sm font-medium">Full name</label><Input value={fullName} onChange={e=>setFullName(e.target.value)} disabled={!canChangeName||saving} maxLength={80}/><p className="text-xs text-muted-foreground">{canChangeName?"You can change your name once every 30 days.":`Name changes are locked until ${new Date(new Date(nameChangedAt!).getTime()+30*24*60*60*1000).toLocaleDateString("en-BD")}.`}</p><Button type="button" disabled={!canChangeName||saving||fullName.trim().length<2||fullName.trim()===name} onClick={saveName}>{saving?"Saving…":"Save name"}</Button></div></div>;
}
