"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: "520px", textAlign: "center" }}>
            <h1>StudyHub needs a refresh</h1>
            <p style={{ lineHeight: 1.6 }}>A critical page error occurred. Reload the page and try again.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
