"use client";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return <Button type="button" size="sm" variant="outline" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); toast.success(`${label} copied`); setTimeout(() => setCopied(false), 1200); }
    catch { toast.error(`Could not copy ${label.toLowerCase()}.`); }
  }} aria-label={`${label} copy`}>
    {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}{copied ? "Copied" : label}
  </Button>;
}
