import { ouraFetch } from "./client";

export function getDefaultDateRange(): { start_date: string; end_date: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    start_date: formatDate(yesterday),
    end_date: formatDate(today),
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchDailySleep(start?: string, end?: string): Promise<unknown> {
  const defaults = getDefaultDateRange();
  const params = {
    start_date: start ?? defaults.start_date,
    end_date: end ?? defaults.end_date,
  };

  return ouraFetch("/v2/usercollection/daily_sleep", params);
}
