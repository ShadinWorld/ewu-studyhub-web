"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  completeAccountAction,
} from "@/app/account/actions";
import {
  switchGoogleAccountAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Complete account"}
    </Button>
  );
}

function SwitchGoogleButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Switching…" : "Use another Google account"}
    </Button>
  );
}

export function CompleteAccountForm({ next }: { next: string }) {
  const [state, formAction] = useFormState(
    completeAccountAction,
    undefined
  );

  const [
    switchState,
    switchFormAction,
  ] = useFormState(
    switchGoogleAccountAction,
    undefined
  );

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div>
          <h2 className="font-semibold">Complete your account</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Phone number is required. Without it, you cannot continue using
            EWU StudyHub.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>

          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            pattern="01[0-9]{9}"
            maxLength={11}
            required
          />
        </div>

        <input
          type="hidden"
          name="next"
          value={next}
        />

        {state?.error && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <form
        action={switchFormAction}
        className="space-y-2"
      >
        <input
          type="hidden"
          name="next"
          value={next}
        />

        {switchState?.error && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {switchState.error}
          </p>
        )}

        <SwitchGoogleButton />

        <p className="text-center text-xs text-muted-foreground">
          Use this if you signed in with the wrong Google account.
        </p>
      </form>
    </div>
  );
}