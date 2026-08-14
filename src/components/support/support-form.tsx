"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createSupportTicket } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function SupportForm({ pagePath = "/support", compact = false, defaultCategory = "general" }: { pagePath?: string; compact?: boolean; defaultCategory?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          try {
            await createSupportTicket(formData);
            toast.success("Thanks! Your message was sent to the admin.");
            formRef.current?.reset();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not send your message.");
          }
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="page_path" value={pagePath} />
      <div>
        <div className="space-y-2">
          <Label htmlFor="support-category">What do you need help with?</Label>
          <select id="support-category" name="category" defaultValue={defaultCategory} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="suggestion">Suggestion</option>
            <option value="complaint">Complaint</option>
            <option value="general">General help</option>
            <option value="payment">Payment problem</option>
            <option value="purchase">Purchase problem</option>
            <option value="resource">Resource problem</option>
            <option value="seller">Seller / payout problem</option>
            <option value="account">Account problem</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="support-message">Message</Label>
        <textarea id="support-message" name="message" required maxLength={5000} rows={compact ? 4 : 6} placeholder="Tell us what happened, what you need, or what you would improve..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Sending..." : "Send to Admin"}</Button>
    </form>
  );
}

export function SupportFormCard({ pagePath, defaultCategory }: { pagePath?: string; defaultCategory?: string }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <SupportForm pagePath={pagePath} defaultCategory={defaultCategory} />
      </CardContent>
    </Card>
  );
}
