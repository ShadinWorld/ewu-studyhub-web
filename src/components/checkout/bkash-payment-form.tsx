"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitBkashPayment, type CheckoutFormState } from "@/app/checkout/[fileId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Submitting…" : "Submit payment for verification"}
    </Button>
  );
}

export function BkashPaymentForm({ fileId }: { fileId: string }) {
  const [state, formAction] = useFormState<CheckoutFormState | undefined, FormData>(submitBkashPayment, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="fileId" value={fileId} />
      <div className="space-y-2">
        <Label htmlFor="buyer_bkash_number">Your bKash number</Label>
        <Input id="buyer_bkash_number" name="buyer_bkash_number" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" pattern="01[0-9]{9}" maxLength={11} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment_reference">bKash Transaction ID <span className="text-muted-foreground">(optional — you can leave this blank)</span></Label>
        <Input id="payment_reference" name="payment_reference" placeholder="Optional: e.g. 8A7B6C5D4E" />
      </div>
      <p className="text-xs text-muted-foreground">Your payment will remain pending until an admin checks the transaction. Access is granted only after approval.</p>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
