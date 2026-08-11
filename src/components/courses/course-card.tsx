import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CourseCard({
  course,
}: {
  course: {
    id: string;
    course_code: string;
    course_name: string;
    credit: number | null;
    departmentName?: string;
    resourceCount: number;
  };
}) {
  return (
    <Link
      href={`/course/${course.id}`}
      className="group flex flex-col justify-between rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-sm font-semibold text-primary">{course.course_code}</p>
          {course.credit != null && <Badge variant="secondary">{course.credit} Credits</Badge>}
        </div>
        <h3 className="mt-1 line-clamp-2 text-base font-medium leading-snug">{course.course_name}</h3>
        {course.departmentName && <p className="mt-1 text-xs text-muted-foreground">{course.departmentName}</p>}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          {course.resourceCount} {course.resourceCount === 1 ? "Resource" : "Resources"}
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Explore
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
