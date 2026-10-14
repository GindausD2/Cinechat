import "dotenv/config";
import { sendDueReminders } from "../src/lib/reminders";
import { db } from "../src/lib/db";
try { console.log(`Delivered ${await sendDueReminders()} in-app screening reminders.`); } finally { await db.$disconnect(); }
