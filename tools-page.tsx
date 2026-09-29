import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Calculator,
  BarChart3,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileClock,
  FileQuestion,
  GraduationCap,
  Lightbulb,
  ListChecks,
  SearchCheck,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveStudentTools } from "@/lib/student-tools";

const iconMap: Record<string, LucideIcon> = {
  CalendarDays,
  ClipboardCheck,
  FileClock,
  FileQuestion,
  GraduationCap,
  Calculator,
  ListChecks,
  BookOpen,
  Clock3,
  SearchCheck,
  Lightbulb,
  Wrench,
  BarChart3,
  ExternalLink,
};

export default async function ToolsPage() {
  const tools = await getActiveStudentTools();

  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container flex-1 py-8 sm:py-12">
    <div className="max-w-3xl"><p className="text-sm font-semibold text-primary">EWU Student Tools</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Useful tools beyond resources.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Academic dates, exam schedules, deadlines and helpful utilities — managed from the StudyHub Admin dashboard.</p></div>
    <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {tools.map(tool => {
        const Icon = iconMap[tool.icon] ?? GraduationCap;
        const external = tool.open_in_new_tab || /^https:\/\//.test(tool.href);
        return <Link key={tool.id} href={tool.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="group"><Card className="h-full transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"><CardContent className="p-3.5 sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h2 className="mt-3 line-clamp-2 text-sm font-semibold group-hover:text-primary sm:mt-4 sm:text-base">{tool.title}</h2><p className="mt-1 line-clamp-3 text-[10px] leading-4 text-muted-foreground sm:text-sm sm:leading-6">{tool.description}</p></CardContent></Card></Link>;
      })}
    </div>
    {!tools.length ? <Card className="mt-8"><CardContent className="p-8 text-center text-sm text-muted-foreground">No Student Academic Tools are currently available.</CardContent></Card> : null}
    <div className="mt-8 rounded-2xl border bg-primary/5 p-5"><div className="flex items-start gap-3"><GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary"/><div><p className="font-semibold">Managed for the EWU community</p><p className="mt-1 text-sm text-muted-foreground">Admins can add useful tool links or remove tools from this directory without deleting the underlying StudyHub feature.</p></div></div></div>
  </main><Footer /></div>;
}
