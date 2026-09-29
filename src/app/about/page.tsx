import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Eye, Search, ShieldCheck, ShoppingBag, Store, Upload, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const resources = [
  "Handwritten Notes",
  "Reports",
  "Presentation Slides",
  "Assignments",
  "Previous Questions",
  "Other Academic Resources",
];

const features = [
  [Search, "Course & Department Discovery", "Course, Department বা Search ব্যবহার করে প্রয়োজনের Resource খুঁজে দেখুন।"],
  [Eye, "Resource Preview", "Purchase-এর আগে available Preview দেখে Resource আপনার প্রয়োজনের সঙ্গে মিলছে কি না বুঝে নিন।"],
  [ShoppingBag, "Purchase & Access", "Approved Purchase-এর পরে authorized View/Download access পাওয়া যায়।"],
  [Upload, "Resource Upload", "নিজের useful Academic Resource Upload করে Free বা Paidভাবে share করতে পারেন।"],
  [Wallet, "Seller Earnings & Payout", "Approved Paid Sale থেকে Seller Earnings তৈরি হতে পারে এবং eligible হলে payout workflow ব্যবহার করা যায়।"],
  [CalendarDays, "Academic Tools", "Academic Calendar, Deadline, Final Exam, Grade Calculator ও Prerequisite-এর মতো utility এক জায়গায় পাওয়া যায়।"],
];

export default function AboutStudyHubPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8 sm:py-12">
        <article className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
            <p className="text-sm font-semibold text-primary">EWU StudyHub</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Upload. Share. Earn.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              EWU StudyHub হলো East West University students-এর জন্য তৈরি একটি Academic Resource Platform & Marketplace—যেখানে প্রয়োজনের Resource খোঁজা, ব্যবহার করা এবং নিজের Resource-এর value তৈরি করা একই ecosystem-এর মধ্যে সম্ভব।
            </p>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card><CardContent className="p-5"><Search className="h-5 w-5 text-primary"/><h2 className="mt-3 font-bold">Find What You Need</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Course, Department বা Search ব্যবহার করে Notes, Reports, Slides, Assignments, Previous Questions এবং অন্যান্য Resource খুঁজুন।</p></CardContent></Card>
            <Card><CardContent className="p-5"><Upload className="h-5 w-5 text-primary"/><h2 className="mt-3 font-bold">Share What You Create</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">নিজের পড়াশোনার জন্য তৈরি useful Resource শুধু phone বা Drive-এ পড়ে না রেখে অন্য Student-এর সঙ্গে share করুন।</p></CardContent></Card>
            <Card><CardContent className="p-5"><Wallet className="h-5 w-5 text-primary"/><h2 className="mt-3 font-bold">Create an Earning Opportunity</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Eligible Seller হিসেবে Paid Resource-এর approved sale থেকে Earnings-এর opportunity তৈরি করতে পারেন।</p></CardContent></Card>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">Find What You Need</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">কোনো Course-এর Notes দরকার? Previous Questions খুঁজছেন? কোনো Report বা Presentation Resource প্রয়োজন? Course, Department বা Search ব্যবহার করে Resource খুঁজে দেখতে পারেন।</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                "Course ও Department অনুযায়ী Resource খোঁজা",
                "Resource Search করা",
                "Resource Preview দেখা",
                "Useful Resource Save করে রাখা",
                "Free Resource ব্যবহার করা",
                "প্রয়োজনীয় Paid Resource Purchase করা",
              ].map((item) => <div key={item} className="flex items-start gap-2 rounded-xl bg-muted/30 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/>{item}</div>)}
            </div>
          </section>

          <section className="rounded-3xl border border-primary/20 bg-primary/[0.035] p-6 sm:p-8">
            <div className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">তোমার নিজের Resource আছে?</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">প্রতি semester-এ আমরা নিজেদের পড়ার জন্য handwritten notes বানাই, report করি, presentation slide তৈরি করি, assignment করি, previous question collect করি। Semester শেষ হলে এগুলোর অনেক কিছুই phone, Drive বা laptop-এ পড়ে থাকে। অথচ একই Course পরের semester-এ আবার অন্য Studentরা করবে—তাদের জন্য সেই Resource আবার useful হতে পারে।</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((item) => <div key={item} className="rounded-xl border bg-background/80 px-3 py-2.5 text-sm font-medium">{item}</div>)}
            </div>
            <div className="mt-6 rounded-2xl border bg-background p-4 sm:p-5">
              <p className="font-bold">🎓 Student → Creator → Seller</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">নিজের useful Resource তৈরি করুন → Upload করুন → অন্যদের সঙ্গে Share করুন → eligible হলে Seller হিসেবে Earnings-এর opportunity তৈরি করুন।</p>
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">How Does Earning Work?</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">কোনো Student তোমার Paid Resource Purchase করলে এবং সেই sale approved হলে, সেই sale থেকে তোমার Earnings-এর opportunity তৈরি হয়। একটি useful Resource future-এ আবার অন্য Student-এরও প্রয়োজন হতে পারে; তবে actual Earnings নির্ভর করবে Resource-এর purchases এবং platform-এর applicable approval/payout process-এর ওপর।</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {['তোমার Resource', 'অন্য Student-এর প্রয়োজন', 'Purchase', 'Approved Sale', 'Seller Earnings'].map((step, index) => <div key={step} className="flex items-center gap-2"><span className="rounded-full border bg-muted/40 px-3 py-2">{step}</span>{index < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground"/>}</div>)}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><Store className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">Seller হওয়া</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Eligible Studentরা Seller workflow ব্যবহার করে নিজেদের Academic Resource Upload করতে পারে। Manual EWU verification-এর সময় bKash Number লাগে না; verification complete হওয়ার পর Paid Resource publish এবং Earnings/Payout-এর প্রয়োজন অনুযায়ী Payment Settings-এ bKash setup করা যায়।</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold"><Badge variant="outline">EWU verification</Badge><span className="self-center text-muted-foreground">→</span><Badge variant="outline">Admin review</Badge><span className="self-center text-muted-foreground">→</span><Badge variant="outline">Seller</Badge><span className="self-center text-muted-foreground">→</span><Badge variant="outline">Upload / Sell</Badge></div>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">Student হিসেবে কী করতে পারো?</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">পরের semester-এ নতুন Course শুরু করলে অন্য Studentদের তৈরি Resource খুঁজে দেখতে পারো, available Preview দেখে নিতে পারো এবং প্রয়োজন হলে Purchase করতে পারো। নিজের Purchased Resources, Saved Resources এবং Notifications-ও এক জায়গা থেকে manage করতে পারো।</p>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">Smart Resource Search</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Course code, Course name, topic বা সাধারণ ভাষায় কী দরকার সেটা লিখে Search করতে পারো। AI-powered Resource discovery থাকায় natural query দিয়েও প্রয়োজনের Resource খোঁজার সুযোগ আছে।</p>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">More Than a Resource Marketplace</h2></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([Icon, title, text]) => { const FeatureIcon = Icon as typeof Search; return <div key={title as string} className="rounded-2xl border p-4"><FeatureIcon className="h-5 w-5 text-primary"/><h3 className="mt-3 font-semibold">{title as string}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text as string}</p></div>; })}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">Safe & Controlled Access</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Paid Resource-এর access purchase status-এর সঙ্গে connected থাকে। Purchase approve হওয়ার পর eligible Student protected Resource access করতে পারে। Resource Upload, Seller verification, Purchase approval, Payment review এবং Seller payout-এর মতো গুরুত্বপূর্ণ process controlled workflow-এর মাধ্যমে পরিচালিত হয়।</p>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">How EWU StudyHub Works</h2></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border p-4"><p className="font-bold">👨‍🎓 Student</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Explore → Search → Preview → Save/Purchase → Access</p></div>
              <div className="rounded-2xl border p-4"><p className="font-bold">📤 Resource Creator</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Create → Upload → Share → Help Others</p></div>
              <div className="rounded-2xl border p-4"><p className="font-bold">💰 Seller</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Upload → Publish → Approved Sales → Earn</p></div>
            </div>
          </section>

          <section className="rounded-3xl border border-primary/20 bg-primary/[0.035] p-6 sm:p-8">
            <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/><h2 className="text-2xl font-bold">The Idea Behind EWU StudyHub</h2></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">একজন Student এক semester-এ নিজের পড়াশোনার জন্য অনেক কিছু তৈরি করে—Notes, Reports, Presentation, Questions, Projects এবং অন্যান্য Academic Resource। Semester শেষ হলে এগুলোর অনেক কিছু পড়ে থাকে। কিন্তু একই Course পরের semester-এ আবার অন্য Studentরা করবে। তাই একটি Student-এর তৈরি useful Resource অন্য Student-এর জন্য valuable হতে পারে। EWU StudyHub সেই connection তৈরি করার চেষ্টা করছে।</p>
            <div className="mt-5 rounded-2xl border bg-background p-4 text-center text-sm font-bold sm:p-5">Student Knowledge → Academic Resource → Community Value → Earning Opportunity</div>
          </section>

          <section className="rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-primary">🎓 Built for EWU Students</p>
            <h2 className="mt-2 text-2xl font-bold">Find what you need. Share what you know.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">EWU StudyHub-এর লক্ষ্য হলো EWU Student community-এর মধ্যে Academic Resource খুঁজে পাওয়া, ব্যবহার করা, Share করা এবং তৈরি করার একটি connected environment তৈরি করা।</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2"><Button asChild><Link href="/search">Explore Resources <ArrowRight className="ml-2 h-4 w-4"/></Link></Button><Button asChild variant="outline"><Link href="/dashboard/become-seller">Become a Seller <Store className="ml-2 h-4 w-4"/></Link></Button></div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
