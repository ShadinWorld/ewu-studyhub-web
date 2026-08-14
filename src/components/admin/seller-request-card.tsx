"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveSeller, rejectSeller } from "@/app/admin/sellers/actions";

export function SellerRequestCard({ request }: { request: any }) {
  const [isPending, startTransition] = useTransition();
  const [handled, setHandled] = useState(false);
  if (handled) return null;

  function act(fn: () => Promise<any>, msg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(msg);
        setHandled(true);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{request.full_name}</p>
          <p className="text-sm text-muted-foreground">{request.university_email}</p>
          <p className="text-xs text-muted-foreground">Student ID: {request.student_id}</p>
          <p className="text-xs text-muted-foreground">bKash: {request.seller_bkash_number || "Not provided"}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={isPending} onClick={() => act(() => approveSeller(request.id), "Seller approved")}>
            <Check className="mr-1 h-4 w-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => act(() => rejectSeller(request.id), "Request rejected")}
          >
            <X className="mr-1 h-4 w-4" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
