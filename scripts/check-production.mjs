import "dotenv/config";
const errors = [];
for (const name of ["DATABASE_URL", "REDIS_URL", "AUTH_SECRET", "REALTIME_SECRET", "AUTH_URL", "APP_ORIGIN", "NEXT_PUBLIC_WS_URL", "SMTP_URL", "EMAIL_FROM", "REGION_DEFAULT", "MEDIA_ALLOWED_HOSTS"]) if (!process.env[name]) errors.push(`${name} is required`);
for (const name of ["AUTH_SECRET", "REALTIME_SECRET"]) if ((process.env[name] || "").length < 32 || process.env[name]?.startsWith("replace-with")) errors.push(`${name} must be random and at least 32 characters`);
for (const name of ["AUTH_URL", "APP_ORIGIN", "NEXT_PUBLIC_WS_URL"]) if (!process.env[name]?.startsWith("https://") || /localhost|127\.0\.0\.1/.test(process.env[name] || "")) errors.push(`${name} must be a production HTTPS origin`);
if (process.env.ALLOW_LOCAL_MEDIA === "true") errors.push("Disable ALLOW_LOCAL_MEDIA for launch");
if (process.env.EMAIL_DEV_OUTBOX === "true") errors.push("Disable EMAIL_DEV_OUTBOX for launch");
if (process.env.STRIPE_SECRET_KEY?.includes("_live_")) errors.push("Live Stripe keys are rejected in V1");
if (errors.length) { for (const error of errors) console.error(error); process.exit(1); }
console.log("Production configuration checks passed. Hosting, rights and provider smoke tests still require configured infrastructure.");
