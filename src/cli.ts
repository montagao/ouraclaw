#!/usr/bin/env bun

import { runOAuthFlow } from "./auth/oauth";
import { fetchDailySleep } from "./api/daily-sleep";
import { fetchSleep } from "./api/sleep";

export interface ParsedArgs {
  command: string | undefined;
  start: string | undefined;
  end: string | undefined;
}

export function parseArgs(argv: string[]): ParsedArgs {
  // argv[0] = bun, argv[1] = script path, argv[2+] = user args
  const args = argv.slice(2);
  let command: string | undefined;
  let start: string | undefined;
  let end: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--start" || arg === "-s") {
      start = args[++i];
    } else if (arg === "--end" || arg === "-e") {
      end = args[++i];
    } else if (!arg?.startsWith("-")) {
      command = arg;
    }
  }

  return { command, start, end };
}

const USAGE = `Usage: ouraclaw <command> [options]

Commands:
  auth     Authenticate with Oura (OAuth2 flow)
  score    Fetch daily sleep scores (JSON)
  sleep    Fetch detailed sleep sessions (JSON)

Options:
  --start, -s <date>   Start date (YYYY-MM-DD)
  --end,   -e <date>   End date (YYYY-MM-DD)
`;

export async function run(argv: string[]): Promise<void> {
  const { command, start, end } = parseArgs(argv);

  switch (command) {
    case "auth":
      await runOAuthFlow();
      break;

    case "score": {
      const data = await fetchDailySleep(start, end);
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case "sleep": {
      const data = await fetchSleep(start, end);
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    default:
      console.error(USAGE);
      process.exit(1);
  }
}

// Only run when executed directly, not when imported for tests
if (import.meta.main) {
  run(process.argv).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
