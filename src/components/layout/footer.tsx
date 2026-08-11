import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t mt-24">
      <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-semibold mb-3">EWU StudyHub</h4>
          <p className="text-muted-foreground">
            Academic resource marketplace for university students in Bangladesh.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold mb-1">Platform</h4>
          <Link href="/search" className="text-muted-foreground hover:text-foreground">Browse resources</Link>
          <Link href="/departments" className="text-muted-foreground hover:text-foreground">Departments</Link>
          <Link href="/dashboard/upload" className="text-muted-foreground hover:text-foreground">Become a seller</Link>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold mb-1">Legal</h4>
          <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
          <Link href="/legal/content-policy" className="text-muted-foreground hover:text-foreground">Content Policy</Link>
          <Link href="/legal/copyright" className="text-muted-foreground hover:text-foreground">Copyright / DMCA</Link>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold mb-1">Support</h4>
          <Link href="/legal/academic-integrity" className="text-muted-foreground hover:text-foreground">Academic Integrity</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </div>
      </div>
      <div className="container py-6 border-t text-xs text-muted-foreground">
        © {new Date().getFullYear()} EWU StudyHub. All rights reserved.
      </div>
    </footer>
  );
}
