import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Sparkles, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones = [
  "from-primary/10 via-background to-background border-primary/20",
  "from-sky-500/10 via-background to-background border-sky-500/20",
  "from-violet-500/10 via-background to-background border-violet-500/20",
  "from-amber-500/10 via-background to-background border-amber-500/20",
];

export function CourseCard({
  course,
  index = 0,
}: {
  course: {
    id: string;
    course_code: string;
    course_name: string;
    credit: number | null;
    departmentName?: string;
    resourceCount: number;
  };
  index?: number;
}) {
  return (
    <Link
      href={`/course/${course.id}`}
      className={cn(
        "group relative flex min-h-[186px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[190px] sm:p-5",
        tones[index % tones.length]
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-1.5">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold text-primary sm:px-2.5 sm:text-xs">
            <BookOpen className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{course.course_code}</span>
          </span>
          {course.credit != null && (
            <Badge variant="secondary" className="shrink-0 rounded-full px-2 py-1 text-[10px] sm:text-xs">
              {course.credit} credits
            </Badge>
          )}
        </div>
        <h3 className="mt-3 line-clamp-3 text-[13px] font-bold leading-5 sm:mt-4 sm:text-base sm:leading-snug">
          {course.course_name}
        </h3>
        {course.departmentName && (
          <p className="mt-2 flex min-w-0 items-start gap-1.5 text-[10px] font-medium leading-4 text-muted-foreground sm:text-xs">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{course.departmentName}</span>
          </p>
        )}
      </div>
      <div className="relative mt-3 flex min-w-0 items-center justify-between gap-1.5 sm:mt-5 sm:gap-3">
        <span className="inline-flex min-w-0 max-w-[56%] items-center gap-1 rounded-full bg-background/80 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground sm:max-w-none sm:px-2.5 sm:text-xs">
          <FileText className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
          <span className="truncate">{course.resourceCount} resources</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1.5 text-[10px] font-bold text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground sm:px-3 sm:text-xs">
          {course.resourceCount > 0 ? <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : null}
          Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 sm:h-3.5 sm:w-3.5" />
        </span>
      </div>
    </Link>
  );
}
