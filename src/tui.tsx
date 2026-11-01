import { For, Show, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { Plugin, usePlugin } from "@opencode/plugin/tui";

const POLL_MS = 30_000;
const BAR_WIDTH = 8;

function bar(fraction: number): string {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round(fraction * BAR_WIDTH)));
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

function shortDuration(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
  return `${Math.floor(minutes / (24 * 60))}d${Math.floor((minutes % (24 * 60)) / 60)}h`;
}

function usd(value: number, precision = 2): string {
  return Number.isFinite(value) && value >= 0 ? `$${value.toFixed(precision)}` : "–";
}

function UsagePanel(props: { sessionID: string }) {
  const context = usePlugin();
  type UsageData = NonNullable<Awaited<ReturnType<typeof context.client.experimental.usage.limits>>["data"]>;
  const [data, setData] = createSignal<UsageData | null>();
  const [loaded, setLoaded] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());
  let alive = true;
  let busy = false;

  const visible = () => {
    const providerID = context.ui.model.current()?.providerID;
    return providerID === "opencode" || providerID === "opencode-go";
  };

  const refresh = async () => {
    if (!alive || busy || !visible()) return;
    busy = true;
    try {
      const location = context.location ?? context.data.location.default();
      const result = await context.client.experimental.usage.limits({
        location: { directory: location.directory },
      });
      if (alive) setData(result.data);
    } catch {
      // The usage-limits endpoint is experimental and may not exist on older servers.
    } finally {
      busy = false;
      if (alive) {
        setLoaded(true);
        setNow(Date.now());
      }
    }
  };

  createEffect(
    on(visible, (active) => {
      if (active) void refresh();
      else {
        setData(undefined);
        setLoaded(false);
      }
    }),
  );

  onMount(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    onCleanup(() => {
      alive = false;
      clearInterval(timer);
    });
  });

  const resetIn = (resetsAt: number): string => {
    now();
    return resetsAt > now() ? shortDuration(resetsAt - now()) : "";
  };

  const usageRows = () => {
    const go = data()?.go;
    return go
      ? [
          { label: "5h", meter: go.rolling },
          { label: "1w", meter: go.weekly },
          { label: "1m", meter: go.monthly },
        ]
      : [];
  };

  const usageColor = (percent: number) => {
    if (percent >= 80) return context.theme.text.feedback.error.base;
    if (percent >= 60) return context.theme.text.feedback.warning.base;
    return context.theme.text.muted;
  };

  const sessionCharge = (): string => {
    now();
    return usd(context.data.session.cost(props.sessionID), 4);
  };

  return (
    <Show when={visible()}>
      <box flexDirection="column">
        <text fg={context.theme.text.faint}>OPENCODE USAGE</text>
        <Show when={loaded()} fallback={<text fg={context.theme.text.faint}>loading usage…</text>}>
          <Show
            when={data()?.go}
            fallback={
              <text fg={context.theme.text.faint}>
                {data() ? "no OpenCode Go limits found" : "usage limits unavailable"}
              </text>
            }
          >
            <For each={usageRows()}>
              {(row) => {
                const used = () => Math.max(0, Math.min(100, row.meter.percent)) / 100;
                const percent = () => Math.round(used() * 100);
                return (
                  <text fg={usageColor(percent())}>
                    {`${row.label} ${bar(used())} ${String(percent()).padStart(3)}% used · ${resetIn(row.meter.resetsAt)}`}
                  </text>
                );
              }}
            </For>
          </Show>
          <text fg={context.theme.text.muted}>{`Session credits: ${sessionCharge()}`}</text>
          <Show when={(data()?.budgets.length ?? 0) > 0}>
            <text fg={context.theme.text.faint}>CONSOLE BUDGETS</text>
            <For each={data()?.budgets.slice(0, 3) ?? []}>
              {(budget, index) => (
                <text fg={context.theme.text.muted}>
                  {`Budget ${index() + 1}: ${usd(budget.spent)} / ${usd(budget.limit)} · ${resetIn(budget.resetsAt)}`}
                </text>
              )}
            </For>
          </Show>
        </Show>
      </box>
    </Show>
  );
}

export default Plugin.define({
  id: "opencode-go-usage.tui",
  setup(context) {
    return context.ui.slot({
      append: "sidebar.content",
      render: (input) => <UsagePanel sessionID={input.sessionID} />,
    });
  },
});
