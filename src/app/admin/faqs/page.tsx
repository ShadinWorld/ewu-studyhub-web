import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFaq, deleteFaq, updateFaq } from "./actions";

const categories = ["General", "Account", "Resources", "Buying", "Selling", "Payment", "EWU Verification", "Support"];

export default async function AdminFaqsPage() {
  const supabase = createClient();
  const { data: faqs } = await supabase.from("faqs").select("id, category, question, answer, sort_order, is_published").order("sort_order", { ascending: true }).order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Knowledge base</p>
        <h2 className="text-2xl font-bold">FAQs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create and maintain the public FAQ section without changing code.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add FAQ</CardTitle></CardHeader>
        <CardContent>
          <form action={createFaq} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label htmlFor="question">Question</Label><Input id="question" name="question" placeholder="How can I become a seller?" required minLength={5} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="answer">Answer</Label><textarea id="answer" name="answer" required minLength={5} className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Write the answer shown to students..." /></div>
            <div className="space-y-2"><Label htmlFor="category">Category</Label><select id="category" name="category" defaultValue="General" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="sort_order">Display order</Label><Input id="sort_order" name="sort_order" type="number" defaultValue={0} /></div>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="is_published" defaultChecked /> Publish on website</label>
            <Button type="submit" className="w-fit">Add FAQ</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(faqs ?? []).map((faq) => (
          <Card key={faq.id}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{faq.question}</CardTitle><p className="text-xs text-muted-foreground">{faq.category} · order {faq.sort_order} · {faq.is_published ? "Published" : "Hidden"}</p></CardHeader>
            <CardContent className="space-y-4">
              <form action={updateFaq} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="id" value={faq.id} />
                <div className="space-y-2 md:col-span-2"><Label>Question</Label><Input name="question" defaultValue={faq.question} required minLength={5} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Answer</Label><textarea name="answer" defaultValue={faq.answer} required minLength={5} className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="space-y-2"><Label>Category</Label><select name="category" defaultValue={faq.category} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
                <div className="space-y-2"><Label>Display order</Label><Input name="sort_order" type="number" defaultValue={faq.sort_order} /></div>
                <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="is_published" defaultChecked={faq.is_published} /> Published</label>
                <div className="flex gap-2"><Button type="submit">Save changes</Button></div>
              </form>
              <form action={deleteFaq}><input type="hidden" name="id" value={faq.id} /><Button type="submit" variant="destructive" size="sm">Delete FAQ</Button></form>
            </CardContent>
          </Card>
        ))}
        {!faqs?.length && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No FAQs yet.</CardContent></Card>}
      </div>
    </div>
  );
}
