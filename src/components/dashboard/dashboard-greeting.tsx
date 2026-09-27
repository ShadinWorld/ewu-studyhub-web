"use client";

import { useEffect, useState } from "react";

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 21) return "Good evening";
  return "Good night";
}

export function DashboardGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting(new Date().getHours()));
    updateGreeting();

    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
      {greeting}, {name} 👋
    </h1>
  );
}
