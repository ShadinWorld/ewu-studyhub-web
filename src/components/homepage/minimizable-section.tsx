"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

export function MinimizableSection({
  id,
  title,
  description,
  children,
  className = "",
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const storageKey = `ewu-studyhub:home-section:${id}`;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === "collapsed");
    } catch {
      // Keep the default expanded state when storage is unavailable.
    }
  }, [storageKey]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(storageKey, next ? "collapsed" : "expanded");
    } catch {
      // Ignore persistence failures; the current UI state still works.
    }
  }

  return (
    <section className={className} data-home-section={id}>
      <div className="container">
        <div className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">StudyHub</p>
            <h2 className="text-base font-bold sm:text-lg">{title}</h2>
            {description ? <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls={`${id}-content`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
          >
            {collapsed ? "Expand" : "Minimize"}
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div id={`${id}-content`} className={collapsed ? "hidden" : "block"}>
        {children}
      </div>
    </section>
  );
}
