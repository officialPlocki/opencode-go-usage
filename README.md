# OpenCode Go Usage

A standalone OpenCode V2 TUI plugin that adds Go usage and Console spending information to the sidebar.

## What it shows

- OpenCode Go usage for the rolling 5-hour, weekly, and monthly limits, including reset countdowns.
- The amount OpenCode reports as charged for the current session.
- Console budgets when the usage API returns them.

The supported usage-limits API does not expose the live prepaid wallet balance, so the plugin does not display or
estimate one. Session charges are reported by OpenCode, not inferred from model prices.

Example sidebar output:

```text
OPENCODE USAGE
5h ███░░░░░  46% used · 2h14
1w █░░░░░░░  12% used · 4d08h
1m ██░░░░░░  31% used · 18d03h
Session credits: $0.0000
```

## Install from this checkout

Install the package dependencies:

```bash
cd /path/to/opencode-go-usage
npm install
```

Add the plugin directory to the global OpenCode CLI configuration at `~/.config/opencode/cli.json`. Preserve any
existing settings and plugin entries:

```json
{
  "plugins": [
    "/absolute/path/to/opencode-go-usage"
  ]
}
```

This is a TUI-only plugin, so `cli.json` keeps it active even when the CLI connects to a remote OpenCode server. Select
an `opencode-go/...` model to see Go limits; `opencode/...` models also show session charges and Console budgets.

## Development

```bash
npm run typecheck
```
