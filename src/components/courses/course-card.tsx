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
        "group relative flex min-h-[172px] flex-col justify-between sm:min-h-[190px] overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 shadow-sm sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        tones[index % tones.length]
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            <BookOpen className="h-3.5 w-3.5" /> {course.course_code}
          </span>
          {course.credit != null && <Badge variant="secondary" className="rounded-full">{course.credit} credits</Badge>}
        </div>
        <h3 className="mt-3 line-clamp-3 text-sm font-bold leading-snug sm:mt-4 sm:text-base">{course.course_name}</h3>
        {course.departmentName && <p className="mt-2 flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground"><GraduationCap className="h-3.5 w-3.5 shrink-0" />{course.departmentName}</p>}
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-2 sm:mt-5 sm:gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> {course.resourceCount} resources
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1.5 text-xs font-bold text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
          {course.resourceCount > 0 ? <Sparkles className="h-3.5 w-3.5" /> : null}
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
