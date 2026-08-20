import Link from "next/link";
import { CalendarDays, ClipboardCheck, FileClock, FileQuestion, GraduationCap } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

const tools = [
  { href: "/tools/academic-calendar", title: "Academic Calendar", text: "See the latest EWU academic calendar PDF for your semester.", icon: CalendarDays },
  { href: "/tools/final-exams", title: "Final Exam Schedule", text: "Open the latest final exam schedule by Spring, Summer or Fall term.", icon: ClipboardCheck },
  { href: "/tools/deadlines", title: "Deadline Tracker", text: "Keep important academic and StudyHub deadlines in one place.", icon: FileClock },
  { href: "/tools/resource-request", title: "Request a Resource", text: "Ask the StudyHub community for a missing note, question bank or other resource.", icon: FileQuestion },
];

export default function ToolsPage() {
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container flex-1 py-8 sm:py-12">
    <div className="max-w-3xl"><p className="text-sm font-semibold text-primary">EWU Student Tools</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Useful tools beyond resources.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Academic dates, exam schedules, deadlines and resource requests — all in one place.</p></div>
    <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{tools.map(({href,title,text,icon:Icon})=><Link key={href} href={href} className="group"><Card className="h-full transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"><CardContent className="p-3.5 sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h2 className="mt-3 line-clamp-2 text-sm font-semibold group-hover:text-primary sm:mt-4 sm:text-base">{title}</h2><p className="mt-1 line-clamp-3 text-[10px] leading-4 text-muted-foreground sm:text-sm sm:leading-6">{text}</p></CardContent></Card></Link>)}</div>
    <div className="mt-8 rounded-2xl border bg-primary/5 p-5"><div className="flex items-start gap-3"><GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary"/><div><p className="font-semibold">Built around EWU's semester flow</p><p className="mt-1 text-sm text-muted-foreground">Admin can replace academic-calendar and final-exam files (PDF or image) whenever EWU publishes a new term.</p></div></div></div>
  </main><Footer /></div>;
}
