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
        "group relative flex min-h-[205px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[218px] sm:p-5",
        tones[tone]
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/30 blur-2xl dark:bg-white/5" />
      <div className="relative min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl", iconTones[tone])}>
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <span className="max-w-[54%] break-words rounded-full border bg-background/70 px-2 py-1 text-center text-[9px] font-bold uppercase leading-3 tracking-wide backdrop-blur sm:px-2.5 sm:text-[11px] sm:leading-4">
            {department.short_name}
          </span>
        </div>
        <h3 className="mt-3 min-h-[3.75rem] break-words text-[13px] font-bold leading-5 sm:mt-5 sm:min-h-[3.6rem] sm:text-lg sm:leading-snug">{department.name}</h3>
        {department.resourceCount > 0 && <p className="mt-2 flex min-h-8 items-start gap-1 text-[10px] font-semibold leading-4 text-primary sm:text-xs"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">Active resource community</span></p>}
      </div>
      <div className="relative mt-3 flex min-w-0 items-center justify-between gap-1.5 sm:mt-5 sm:gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 text-[9px] font-medium text-muted-foreground sm:flex sm:gap-2 sm:text-xs">
          <span className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full bg-background/75 px-1.5 py-1.5 text-center leading-4 sm:px-2.5 sm:py-1">
            <BookOpen className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> <span className="break-words">{department.courseCount} courses</span>
          </span>
          <span className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full bg-background/75 px-1.5 py-1.5 text-center leading-4 sm:px-2.5 sm:py-1">
            <FileText className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> <span className="break-words">{department.resourceCount} resources</span>
          </span>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/85 shadow-sm transition-transform group-hover:translate-x-1 sm:h-9 sm:w-9">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
