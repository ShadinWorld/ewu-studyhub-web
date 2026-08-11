"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// New signups no longer need this page — email confirmation is off, so
// signupAction logs the person straight in. This page only shows up as a
// fallback for an older account created back when confirmation was still
// required and that never got confirmed; those need an admin to confirm
// them manually in the Supabase dashboard (Authentication → Users).
function UnconfirmedAccount() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md animate-slide-up text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <AlertTriangle className="h-6 w-6 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl">Account not confirmed</CardTitle>
          <CardDescription>
            <strong>{email || "This account"}</strong> was created before email confirmation was turned off
            and was never confirmed. Contact an admin to confirm it, or sign up again with a different email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <UnconfirmedAccount />
    </Suspense>
  );
}
