import Link from "next/link";
import { ArrowRight, BookOpen, HelpCircle, ShieldCheck, Store } from "lucide-react";

const linkClass = "text-muted-foreground transition-colors hover:text-foreground";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-muted/10">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-base font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span>
            EWU StudyHub
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">An academic resource marketplace built for EWU students to discover, save, buy and share useful course materials.</p>
          <Link href="/support" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Need help? Open Support Center <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <h4 className="mb-1 font-semibold">Explore</h4>
          <Link href="/search" className={linkClass}>Browse resources</Link>
          <Link href="/courses" className={linkClass}>Courses</Link>
          <Link href="/departments" className={linkClass}>Departments</Link>
          <Link href="/trending" className={linkClass}>Trending</Link>
          <Link href="/saved" className={linkClass}>Saved resources</Link>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <h4 className="mb-1 font-semibold">Community</h4>
          <Link href="/dashboard/become-seller" className={linkClass}><span className="inline-flex items-center gap-2"><Store className="h-4 w-4" />Become a seller</span></Link>
          <Link href="/dashboard/upload" className={linkClass}>Upload a resource</Link>
          <Link href="/support" className={linkClass}><span className="inline-flex items-center gap-2"><HelpCircle className="h-4 w-4" />FAQ & Support</span></Link>
          <Link href="/legal/academic-integrity" className={linkClass}>Academic Integrity</Link>
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <h4 className="mb-1 font-semibold">Legal & trust</h4>
          <Link href="/legal/privacy" className={linkClass}>Privacy Policy</Link>
          <Link href="/legal/terms" className={linkClass}>Terms of Service</Link>
          <Link href="/legal/content-policy" className={linkClass}>Content Policy</Link>
          <Link href="/legal/copyright" className={linkClass}>Copyright / DMCA</Link>
          <span className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Built for the EWU community</span>
        </div>
      </div>
      <div className="border-t">
        <div className="container flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} EWU StudyHub. All rights reserved.</span>
          <span>Academic resources • EWU community • Bangladesh</span>
        </div>
      </div>
    </footer>
  );
}
