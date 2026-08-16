"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function createResourceRequest(formData:FormData){const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user) throw new Error("Not authenticated");const title=String(formData.get("title")??"").trim();const details=String(formData.get("details")??"").trim();const courseId=String(formData.get("course_id")??"").trim()||null;if(title.length<3) throw new Error("Please describe the resource you need.");const {error}=await supabase.from("resource_requests").insert({user_id:user.id,course_id:courseId,title,details:details||null});if(error) throw new Error(error.message);revalidatePath("/tools/resource-request");}
