import * as Sentry from "@sentry/cloudflare";

export const onRequest = [
  // Make sure Sentry is the first middleware
  Sentry.sentryPagesPlugin((context) => ({
    dsn: "https://e6803690172d38db5f9b811c2ce56a39@o4511793989812224.ingest.us.sentry.io/4511794007506944",
    // Set tracesSampleRate to 1.0 to capture 100% of spans for tracing.
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,

    // Send structured logs to Sentry
    enableLogs: true,

    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/cloudflare-pages/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },
  })),
  // Add more middlewares here
];
