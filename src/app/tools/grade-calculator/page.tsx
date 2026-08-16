import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { GradeCalculatorClient } from "./grade-calculator-client";

export default function GradeCalculatorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="container flex-1 py-8 sm:py-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Marks helper</p>
          <h1 className="mt-1 text-3xl font-bold">Grade Calculator</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your component scores and weights. The calculator works even
            if your course uses different weight distributions.
          </p>
        </div>

        <GradeCalculatorClient />
      </main>

      <Footer />
    </div>
  );
}
