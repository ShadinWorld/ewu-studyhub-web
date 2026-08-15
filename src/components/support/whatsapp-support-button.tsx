"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, CheckCircle2, CreditCard, FileUp, HelpCircle, LockKeyhole, MessageCircle, ShoppingBag, Store, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const configuredNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "01636050980";
const whatsappNumber = configuredNumber.replace(/\D/g, "").replace(/^0/, "880");

const categories = [
  { id: "account", label: "Login / Account", icon: LockKeyhole },
  { id: "resource", label: "Resource", icon: FileUp },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "purchase", label: "Purchase", icon: ShoppingBag },
  { id: "seller", label: "Seller / Earnings", icon: Store },
  { id: "upload", label: "Upload", icon: FileUp },
  { id: "verification", label: "EWU Verification", icon: CheckCircle2 },
  { id: "technical", label: "Technical Problem", icon: Bug },
  { id: "other", label: "Other", icon: HelpCircle },
] as const;

export function WhatsAppSupportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof categories)[number]["id"] | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; phone_number: string | null; role: string | null } | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setEmail(user.email ?? null);
      const { data } = await supabase.from("profiles").select("full_name, phone_number, role").eq("id", user.id).maybeSingle();
      if (mounted) setProfile(data);
    })();
    return () => { mounted = false; };
  }, []);

  const selectedCategory = useMemo(() => categories.find((category) => category.id === selected), [selected]);

  function buildMessage() {
    const categoryLabel = selectedCategory?.label ?? "General support";
    const lines = [
      "Hello EWU StudyHub Admin 👋",
      "",
      `I need help regarding: ${categoryLabel}`,
      "",
      `Name: ${profile?.full_name || "Not available"}`,
      `Email: ${email || "Not available"}`,
      `Phone: ${profile?.phone_number || "Not available"}`,
      `Role: ${profile?.role || "Not available"}`,
      `Current page: ${pathname || "/"}`,
      "",
      "Please help me with this issue."
    ];
    return lines.join("\n");
  }

  function openWhatsApp() {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
    setSelected(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Get help from EWU StudyHub admin on WhatsApp"
        className="fixed bottom-24 left-4 z-50 inline-flex items-center gap-2 rounded-full border bg-card/95 px-4 py-3 text-sm font-semibold text-foreground shadow-xl backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-2xl md:bottom-6 md:left-6"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:inline">Chat with Admin</span>
        <span className="sm:hidden">Help</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="whatsapp-help-title">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <p className="text-sm font-semibold text-primary">EWU StudyHub Support</p>
                <h2 id="whatsapp-help-title" className="mt-1 text-xl font-bold">How can we help?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose a category and we’ll prepare a useful WhatsApp message for you.</p>
              </div>
              <button type="button" onClick={() => { setOpen(false); setSelected(null); }} aria-label="Close" className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {categories.map((category) => {
                const Icon = category.icon;
                const active = selected === category.id;
                return (
                  <button key={category.id} type="button" onClick={() => setSelected(category.id)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
                    <Icon className="h-5 w-5" />
                    {category.label}
                  </button>
                );
              })}
            </div>
            <div className="border-t bg-muted/20 p-4">
              {selectedCategory && <p className="mb-3 rounded-xl border bg-background p-3 text-xs leading-5 text-muted-foreground">We’ll include your name, email, phone, role and current page so the admin can understand the issue faster.</p>}
              <Button type="button" onClick={openWhatsApp} disabled={!selectedCategory} className="w-full" size="lg"><MessageCircle className="h-4 w-4" />Open WhatsApp</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
