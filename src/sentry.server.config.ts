import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "https://afaa9237a7914003efb8e69bfcf93af8@o4512311525113856.ingest.de.sentry.io/4512311603036240",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Attach local variable values to stack frames
  includeLocalVariables: true,
});
