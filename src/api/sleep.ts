import { ouraFetch } from "./client";
import { getDefaultDateRange } from "./daily-sleep";

export async function fetchSleep(start?: string, end?: string): Promise<unknown> {
  const defaults = getDefaultDateRange();
  const params = {
    start_date: start ?? defaults.start_date,
    end_date: end ?? defaults.end_date,
  };

  return ouraFetch("/v2/usercollection/sleep", params);
}
