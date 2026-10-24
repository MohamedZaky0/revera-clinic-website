"use client";

import { useState } from "react";

// Not linked from any navigation. Visit /sentry-test directly to manually
// confirm Sentry is capturing errors (client and server) on this deployment.
// See ai_docs/manual_tests/SENTRY_SETUP_MANUAL_TESTS.md and DECISIONS.md (DEC-123).
export default function SentryTestPage() {
  const [serverResult, setServerResult] = useState<string | null>(null);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 600 }}>
      <h1>Sentry Test Page</h1>
      <p>
        Internal QA page for manually verifying error monitoring. Each button
        below throws a real error on purpose. After clicking, check{" "}
        <a
          href="https://iox-solutions.sentry.io/issues/"
          target="_blank"
          rel="noreferrer"
        >
          the Sentry issues dashboard
        </a>{" "}
        for a new event.
      </p>

      <button
        type="button"
        onClick={() => {
          throw new Error("Sentry client-side QA test error");
        }}
      >
        Throw client-side error
      </button>

      <br />
      <br />

      <button
        type="button"
        onClick={async () => {
          setServerResult("Requesting…");
          const res = await fetch("/api/sentry-test-error");
          setServerResult(`Server responded with status ${res.status}`);
        }}
      >
        Throw server-side error
      </button>
      {serverResult && <p>{serverResult}</p>}
    </div>
  );
}
