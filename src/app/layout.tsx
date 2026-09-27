import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "sonner";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { WhatsAppSupportButton } from "@/components/support/studyhub-assistant";
import { RealtimeSyncProvider } from "@/components/shared/realtime-sync-provider";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import { SwipeBackGesture } from "@/components/navigation/swipe-back";
import { BackToTopButton } from "@/components/ux/back-to-top";


export const metadata: Metadata = {
  title: {
    default: "EWU StudyHub — Academic Resource Marketplace",
    template: "%s | EWU StudyHub",
  },
  description:
    "Buy and sell notes, question banks, assignments, lab reports and more with fellow university students.",
  manifest: "/manifest.webmanifest",
  applicationName: "EWU StudyHub",
  appleWebApp: { capable: true, title: "EWU StudyHub", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ServiceWorkerRegister />
        <PullToRefresh />
        <SwipeBackGesture />
        <ThemeProvider attribute="class" defaultTheme="ewu-blue" themes={["ewu-blue", "pink", "dark"]} disableTransitionOnChange>
          <RealtimeSyncProvider>
            {children}
          </RealtimeSyncProvider>
          <MobileBottomNav />
          <WhatsAppSupportButton />
          <BackToTopButton />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
