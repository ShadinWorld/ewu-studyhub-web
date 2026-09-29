"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteAcademicDocumentButton({ title }: { title: string }) {
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      className="text-destructive hover:text-destructive"
      onClick={(event) => {
        if (!window.confirm(`Delete “${title}” permanently? This also removes the stored file.`)) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );
}
