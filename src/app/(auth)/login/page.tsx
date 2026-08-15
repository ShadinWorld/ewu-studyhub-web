"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signInWithGoogleAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} size="lg">
      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.23-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.4Z" />
        <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.52A9.75 9.75 0 0 0 12 21.75Z" />
        <path fill="#FBBC05" d="M6.53 13.86A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.3-1.86V7.62H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.38l3.24-2.52Z" />
        <path fill="#EA4335" d="M12 6.11c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.18 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.37l3.24 2.52C7.3 7.83 9.46 6.11 12 6.11Z" />
      </svg>
      {pending ? "Connecting…" : "Continue with Google"}
    </Button>
  );
}

function LoginForm() {
  const [state, formAction] = useFormState(signInWithGoogleAction, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to EWU StudyHub</CardTitle>
          <CardDescription>Sign in or create your account with your Google account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <input type="hidden" name="next" value={next} />
            <GoogleButton />
          </form>
          <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">First time here?</p>
            <p className="mt-1">Google will provide your name, email and profile photo. We’ll ask for your phone number before you can use the account.</p>
          </div>
          {state?.error && <p role="alert" className="mt-4 text-sm text-destructive">{state.error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
