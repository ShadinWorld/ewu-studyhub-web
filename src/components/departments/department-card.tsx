import Link from "next/link";
import { ArrowRight, BookOpen, FileText } from "lucide-react";

export function DepartmentCard({
  department,
}: {
  department: { id: string; name: string; short_name: string; courseCount: number; resourceCount: number };
}) {
  return (
    <Link
      href={`/departments/${department.id}`}
      className="group flex flex-col justify-between rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{department.short_name}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug">{department.name}</h3>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {department.courseCount} {department.courseCount === 1 ? "Course" : "Courses"}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {department.resourceCount} {department.resourceCount === 1 ? "Resource" : "Resources"}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
    </Link>
  );
}
