import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-3xl py-16 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
