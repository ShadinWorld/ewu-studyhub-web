"use client";

import { MessageCircle } from "lucide-react";

const configuredNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "01716529460";
const whatsappNumber = configuredNumber.replace(/\D/g, "").replace(/^0/, "880");
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello EWU StudyHub Admin, I need help regarding my account or a marketplace issue.")}`;

export function WhatsAppSupportButton() {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with EWU StudyHub admin on WhatsApp"
      className="fixed bottom-24 left-4 z-50 inline-flex items-center gap-2 rounded-full border bg-card/95 px-4 py-3 text-sm font-semibold text-foreground shadow-xl backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-2xl md:bottom-6 md:left-6"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
        <MessageCircle className="h-4 w-4" />
      </span>
      <span className="hidden sm:inline">Chat with Admin</span>
      <span className="sm:hidden">Help</span>
    </a>
  );
}
