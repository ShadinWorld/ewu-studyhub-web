"use client";

import { useMemo, useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  name: string;
  score: string;
  weight: string;
};

const initialRows: Row[] = [
  { name: "Midterm", score: "", weight: "30" },
  { name: "Final", score: "", weight: "40" },
  { name: "Assignment", score: "", weight: "30" },
];

function getLetterGrade(percentage: number) {
  if (percentage >= 90) return "A+";
  if (percentage >= 85) return "A";
  if (percentage >= 80) return "A-";
  if (percentage >= 75) return "B+";
  if (percentage >= 70) return "B";
  if (percentage >= 65) return "B-";
  if (percentage >= 60) return "C+";
  if (percentage >= 55) return "C";
  if (percentage >= 50) return "C-";
  if (percentage >= 45) return "D";
  return "F";
}

export function GradeCalculatorClient() {
  const [rows, setRows] = useState<Row[]>(initialRows);

  const result = useMemo(() => {
    let total = 0;
    let totalWeight = 0;

    for (const row of rows) {
      const score = Number(row.score);
      const weight = Number(row.weight);

      if (
        row.score !== "" &&
        row.weight !== "" &&
        Number.isFinite(score) &&
        Number.isFinite(weight)
      ) {
        total += (score * weight) / 100;
        totalWeight += weight;
      }
    }

    const normalizedPercentage =
      totalWeight > 0 ? (total / totalWeight) * 100 : 0;

    return {
      total,
      totalWeight,
      normalizedPercentage,
      grade: getLetterGrade(normalizedPercentage),
    };
  }, [rows]);

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function reset() {
    setRows(initialRows.map((row) => ({ ...row })));
  }

  return (
    <Card className="mt-8 max-w-3xl">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_100px_40px]"
            >
              <Input
                placeholder="Component"
                value={row.name}
                onChange={(event) => updateRow(index, "name", event.target.value)}
              />

              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Score"
                value={row.score}
                onChange={(event) => updateRow(index, "score", event.target.value)}
              />

              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Weight"
                value={row.weight}
                onChange={(event) => updateRow(index, "weight", event.target.value)}
              />

              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => removeRow(index)}
                aria-label={`Remove ${row.name || "component"}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows((current) => [
                ...current,
                { name: "", score: "", weight: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add component
          </Button>

          <Button type="button" variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>

        <div className="mt-6 rounded-2xl bg-primary/5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Calculated grade</p>
              <p className="text-3xl font-bold">
                {result.normalizedPercentage.toFixed(2)}%
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {result.grade} · {result.totalWeight}% of course entered
              </p>
            </div>
          </div>

          {result.totalWeight !== 100 && (
            <p className="mt-3 text-xs text-muted-foreground">
              For a complete course grade, your component weights should total
              100%.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
