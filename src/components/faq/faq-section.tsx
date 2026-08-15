import { HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function FAQSection() {
  const supabase = createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("id, category, question, answer")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(12);

  if (!faqs?.length) return null;

  return (
    <section className="border-y bg-muted/20" aria-labelledby="faq-heading">
      <div className="container py-14 sm:py-18">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-primary">Need to know something?</p>
          <h2 id="faq-heading" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Quick answers for students, buyers and sellers. The StudyHub admin team can update these answers from the admin panel.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faqs.map((faq) => (
            <details key={faq.id} className="group rounded-2xl border bg-card px-4 py-1 shadow-sm transition-colors open:border-primary/30 open:bg-primary/[0.03] sm:px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold [&::-webkit-details-marker]:hidden sm:text-base">
                <span>{faq.question}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="border-t pb-4 pt-3 text-sm leading-6 text-muted-foreground">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary/80">{faq.category}</p>
                <p className="whitespace-pre-line">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
