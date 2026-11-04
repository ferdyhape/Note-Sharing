import { apiData, apiError } from "@/shared/lib/api-response";
import { authorizeCronRequest } from "@/modules/reminders/lib/cron-auth";
import { processDueReminders } from "@/modules/reminders/lib/process-reminders";

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request, process.env.CRON_SECRET);
  if (authorization === "unconfigured") {
    return apiError("cron_unconfigured", "Reminder scan is not configured.", 503);
  }
  if (authorization !== "authorized") {
    return apiError("unauthorized", "Cron authorization required.", 401);
  }

  try {
    return apiData(await processDueReminders());
  } catch {
    return apiError("cron_failed", "Reminder scan failed.", 500);
  }
}
