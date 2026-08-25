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
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
