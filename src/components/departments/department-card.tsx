import Link from "next/link";
import { ArrowRight, BookOpen, FileText, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = [
  "from-emerald-500/15 via-emerald-500/5 to-background border-emerald-200/70 dark:border-emerald-900/70",
  "from-sky-500/15 via-sky-500/5 to-background border-sky-200/70 dark:border-sky-900/70",
  "from-violet-500/15 via-violet-500/5 to-background border-violet-200/70 dark:border-violet-900/70",
  "from-amber-500/15 via-amber-500/5 to-background border-amber-200/70 dark:border-amber-900/70",
  "from-rose-500/15 via-rose-500/5 to-background border-rose-200/70 dark:border-rose-900/70",
  "from-cyan-500/15 via-cyan-500/5 to-background border-cyan-200/70 dark:border-cyan-900/70",
];

const iconTones = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];

export function DepartmentCard({
  department,
  index = 0,
}: {
  department: { id: string; name: string; short_name: string; courseCount: number; resourceCount: number };
  index?: number;
}) {
  const tone = index % tones.length;
  return (
    <Link
      href={`/departments/${department.id}`}
      className={cn(
        "group relative flex min-h-[172px] flex-col justify-between sm:min-h-[190px] overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 shadow-sm sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        tones[tone]
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/30 blur-2xl dark:bg-white/5" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", iconTones[tone])}>
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="rounded-full border bg-background/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
            {department.short_name}
          </span>
        </div>
        <h3 className="mt-4 line-clamp-2 text-sm font-bold leading-snug sm:mt-5 sm:text-lg">{department.name}</h3>
        {department.resourceCount > 0 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" />Active resource community</p>}
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-2 sm:mt-5 sm:gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/75 px-2.5 py-1">
            <BookOpen className="h-3.5 w-3.5" /> {department.courseCount} courses
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background/75 px-2.5 py-1">
            <FileText className="h-3.5 w-3.5" /> {department.resourceCount} resources
          </span>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/85 shadow-sm transition-transform group-hover:translate-x-1">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
