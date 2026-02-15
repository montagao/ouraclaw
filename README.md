# ouraclaw

CLI tool to fetch Oura Ring sleep data via the Oura API V2. Outputs JSON to stdout for piping to `jq` or other tools.

## Prerequisites

- [Bun](https://bun.sh) runtime
- An Oura Ring account
- A registered [Oura API Application](https://cloud.ouraring.com/oauth/applications)

## Install

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone https://github.com/montagao/ouraclaw.git
cd ouraclaw
bun install
```

## Setup

1. Register an API application at https://cloud.ouraring.com/oauth/applications
2. Set the redirect URI to `http://localhost:3001`
3. Create a `.env` file in the project root:

```
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
```

4. Authenticate:

```bash
bun src/cli.ts auth
```

This opens a browser window. Log in to Oura, grant access, and tokens are saved to `.env` automatically.

## Usage

```bash
# Last night's sleep score
bun src/cli.ts score

# Sleep scores for a date range
bun src/cli.ts score --start 2025-02-01 --end 2025-02-15

# Detailed sleep data (stages, HR, HRV, bedtimes)
bun src/cli.ts sleep

# With date range
bun src/cli.ts sleep --start 2025-02-01 --end 2025-02-15

# Pipe to jq
bun src/cli.ts score | jq '.data[0].score'
```

### Commands

| Command | Description |
|---------|-------------|
| `auth`  | OAuth2 login flow, saves tokens to `.env` |
| `score` | Fetch daily sleep scores |
| `sleep` | Fetch detailed sleep sessions |

### Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--start` | `-s` | Start date (YYYY-MM-DD) |
| `--end` | `-e` | End date (YYYY-MM-DD) |

Defaults to last night when no dates are provided.

## Token refresh

Access tokens expire after ~24 hours. The CLI automatically refreshes them on 401 responses using the stored refresh token -- no manual re-auth needed.
# ouraclaw
