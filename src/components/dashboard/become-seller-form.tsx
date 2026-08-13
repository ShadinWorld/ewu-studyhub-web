"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestSellerVerification } from "@/app/dashboard/become-seller/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Submitting…" : "Submit for verification"}
    </Button>
  );
}

type Profile = {
  is_seller?: boolean;
  role?: string;
  university_email?: string | null;
  student_id_verification_status?: string;
  account_email?: string | null;
} | null;

export function BecomeSellerForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState(requestSellerVerification, undefined);

  if (profile?.is_seller || profile?.role === "seller") {
    return (
      <div className="rounded-lg border bg-accent/40 p-4">
        <Badge variant="success">Verified seller</Badge>
        <p className="mt-2 text-sm text-muted-foreground">
          You're already a verified seller with {profile.university_email}. You can upload from the Dashboard.
        </p>
      </div>
    );
  }

  if (profile?.student_id_verification_status === "pending") {
    return (
      <div className="rounded-lg border bg-accent/40 p-4">
        <Badge variant="secondary">Pending review</Badge>
        <p className="mt-2 text-sm text-muted-foreground">
          Your request with {profile.university_email} is waiting for admin approval.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="universityEmail">EWU student email</Label>
        <Input
          id="universityEmail"
          name="universityEmail"
          placeholder="Your EWU student email (e.g. 2022-3-60-070@std.ewubd.edu)"
          defaultValue={profile?.university_email ?? (profile?.account_email?.toLowerCase().endsWith("@std.ewubd.edu") ? profile.account_email : "")}
          required
        />
        <p className="text-xs text-muted-foreground">
          Your signup email can be any valid email. To become a seller, you must provide and verify your official EWU student email.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bkash_number">Seller bKash number</Label>
        <Input
          id="bkash_number"
          name="bkash_number"
          inputMode="numeric"
          placeholder="01XXXXXXXXX"
          pattern="01[0-9]{9}"
          maxLength={11}
          required
        />
        <p className="text-xs text-muted-foreground">
          This is where your approved seller earnings will be sent. You can update it later from Payment Settings.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">{state.success}</p>
      )}

      {!state?.success && <SubmitButton />}
    </form>
  );
}
