import { useState } from "react";
import { Bluetooth, BluetoothOff, ChevronDown, Link2, Plug, RefreshCw, Trash2, Unplug } from "lucide-react";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { SYNC_DEVICE_BY_ID, SYNC_DEVICES } from "../data/syncDevices";
import { SYNC_INTERVALS } from "../engine/syncEngine";
import { useSyncState, useSyncStore } from "../hooks/useAutoSync";
import { useToast } from "../hooks/useToast";
import { bluetoothUnavailableReason } from "../services/bleHealth";
import type { LiveLink } from "../state/syncStore";
import type { MetricId, PairedDevice, SyncDeviceSpec, SyncInterval } from "../types/health";
import { formatLocalDateTime } from "../utils/dates";
import { Panel } from "./shared/Panel";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { Segmented } from "./shared/Segmented";

/** Indicators that at least one catalogued device can send, in catalogue order. */
const SYNC_METRICS: readonly MetricId[] = [...new Set(SYNC_DEVICES.flatMap((d) => d.metrics))];

const INTERVAL_OPTIONS = SYNC_INTERVALS.map((m) => ({ value: m, label: m === 60 ? "1 h" : `${m} min` }));

const LINK_TEXT: Record<LiveLink["status"], string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  lost: "Connection lost",
};

function LinkTag({ spec }: { spec: SyncDeviceSpec }) {
  return spec.link.kind === "ble" ? <ProvenanceTag kind="DEVICE" label="BLUETOOTH" /> : <ProvenanceTag kind="SIM DEVICE" label="SIM BRIDGE" />;
}

function MetricChips({ metrics }: { metrics: readonly MetricId[] }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Indicators">
      {metrics.map((m) => (
        <li key={m} className="rounded-full border border-line px-2 py-px text-2xs text-ink-2">
          {METRIC_GUIDANCE[m].shortName}
        </li>
      ))}
    </ul>
  );
}

function PairedCard({ paired, link, bleBlocked }: { paired: PairedDevice; link: LiveLink | undefined; bleBlocked: string | null }) {
  const sync = useSyncStore();
  const toast = useToast();
  const spec = SYNC_DEVICE_BY_ID[paired.deviceId];
  if (!spec) return null;
  const status = link?.status ?? "idle";
  const connected = status === "connected";
  const isBle = spec.link.kind === "ble";
  const statusClass = connected ? "text-nominal" : status === "lost" ? "text-caution" : "text-ink-3";

  const reconnect = async () => {
    const r = await sync.connect(spec.id);
    if (r.message !== "No device chosen.") toast({ tone: r.ok ? "success" : "warning", title: r.ok ? `${spec.name} connected` : `${spec.name}: not connected`, body: r.message });
  };
  const syncNow = () => {
    const r = sync.syncNow(spec.id);
    toast({ tone: r.ok ? "success" : "warning", title: r.ok ? `${spec.name} synced` : `${spec.name}: nothing saved`, body: r.message });
  };

  return (
    <li className="flex flex-col gap-2 rounded-tile border border-line bg-raised p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-cond text-sm font-bold text-ink">{spec.name}</p>
          {paired.hardwareName ? <p className="truncate font-mono text-2xs text-ink-3">{paired.hardwareName}</p> : null}
        </div>
        <LinkTag spec={spec} />
      </div>
      <p className={`flex items-center gap-1.5 font-mono text-2xs font-semibold ${statusClass}`} aria-live="polite">
        {connected ? <Link2 aria-hidden="true" className="h-3.5 w-3.5" /> : <Unplug aria-hidden="true" className="h-3.5 w-3.5" />}
        {LINK_TEXT[status].toUpperCase()}
        {connected && link?.liveBpm !== undefined ? <span className="ml-1 text-ink">· live {link.liveBpm} bpm</span> : null}
      </p>
      {link?.error && !connected ? <p className="text-2xs text-caution">{link.error}</p> : null}
      <MetricChips metrics={spec.metrics} />
      <p className="text-2xs text-ink-3">Last saved: <span className="font-mono text-ink-2">{formatLocalDateTime(paired.lastSyncAt)}</span></p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-[32px] cursor-pointer items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--c-cyan)]"
            checked={paired.autoSync}
            onChange={(e) => {
              const ok = sync.setAutoSync(spec.id, e.target.checked);
              toast({ tone: ok ? "success" : "warning", title: e.target.checked ? "Auto sync on" : "Auto sync off", body: ok ? spec.name : `${spec.name}. Not saved: browser storage is unavailable.` });
            }}
          />
          Auto sync
        </label>
        {connected ? (
          <button type="button" className="btn btn-secondary min-h-[32px] px-2.5 text-xs" onClick={syncNow}>
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Sync now
          </button>
        ) : (
          <button type="button" className="btn btn-primary min-h-[32px] px-2.5 text-xs" onClick={() => void reconnect()} disabled={status === "connecting" || (isBle && bleBlocked !== null)} title={isBle ? (bleBlocked ?? undefined) : undefined}>
            <Plug aria-hidden="true" className="h-3.5 w-3.5" />
            Reconnect
          </button>
        )}
        {connected && isBle ? (
          <button type="button" className="btn btn-ghost min-h-[32px] px-2 text-xs" onClick={() => sync.disconnect(spec.id)}>
            <Unplug aria-hidden="true" className="h-3.5 w-3.5" />
            Disconnect
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost ml-auto min-h-[32px] px-2 text-xs"
          aria-label={`Forget ${spec.name}`}
          onClick={() => {
            const ok = sync.forget(spec.id);
            toast({ tone: ok ? "info" : "warning", title: `${spec.name} removed`, body: "Readings it already saved stay in the mission record." });
          }}
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          Forget
        </button>
      </div>
    </li>
  );
}

function CatalogueCard({ spec, paired, bleBlocked, connecting }: { spec: SyncDeviceSpec; paired: boolean; bleBlocked: string | null; connecting: boolean }) {
  const sync = useSyncStore();
  const toast = useToast();
  const isBle = spec.link.kind === "ble";
  const blocked = isBle && bleBlocked !== null;

  const connect = async () => {
    const r = await sync.connect(spec.id);
    if (r.message === "No device chosen.") return;
    toast({ tone: r.ok ? "success" : "warning", title: r.ok ? `${spec.name} paired` : `${spec.name}: not connected`, body: r.message });
  };

  return (
    <li className="flex flex-col gap-2 rounded-tile border border-line bg-panel p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-cond text-sm font-bold text-ink">{spec.name}</p>
        <LinkTag spec={spec} />
      </div>
      <p className="text-xs text-ink-2">{spec.summary}</p>
      <MetricChips metrics={spec.metrics} />
      <details className="group text-xs text-ink-2">
        <summary className="inline-flex min-h-[28px] cursor-pointer list-none items-center gap-1 text-ink-3 hover:text-ink">
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" />
          How to connect
        </summary>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          {spec.pairingSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {spec.reference ? (
          <a className="mt-1 inline-block text-cyan underline-offset-2 hover:underline" href={spec.reference.url} target="_blank" rel="noreferrer">
            {spec.reference.label}
          </a>
        ) : null}
      </details>
      {blocked ? <p className="text-2xs text-caution">{bleBlocked}</p> : null}
      <button type="button" className="btn btn-primary mt-auto min-h-[36px] text-xs" onClick={() => void connect()} disabled={paired || blocked || connecting}>
        {isBle ? <Bluetooth aria-hidden="true" className="h-4 w-4" /> : <Plug aria-hidden="true" className="h-4 w-4" />}
        {paired ? "Paired" : connecting ? "Connecting…" : isBle ? "Connect" : "Pair"}
      </button>
    </li>
  );
}

/**
 * Auto Sync: pair wearables and medical-kit instruments once, then readings
 * arrive on their own. Standard Bluetooth health devices connect for real;
 * proprietary mission hardware uses a simulated bridge, labelled as such.
 */
export function AutoSyncPanel() {
  const state = useSyncState();
  const sync = useSyncStore();
  const toast = useToast();
  const [filter, setFilter] = useState<MetricId | "all">("all");
  const bleBlocked = bluetoothUnavailableReason();
  const pairedIds = new Set(state.settings.paired.map((p) => p.deviceId));
  const shown = SYNC_DEVICES.filter((d) => filter === "all" || d.metrics.includes(filter));

  const coverage = (m: MetricId) => state.settings.paired.filter((p) => SYNC_DEVICE_BY_ID[p.deviceId]?.metrics.includes(m)).length;

  return (
    <Panel
      id="sync"
      title="Auto Sync"
      subtitle={
        <>
          Pair each wearable or instrument once. With auto sync on, readings are saved on the chosen interval, checked by the same rules as a manual
          entry, and stay on this device. Standard Bluetooth health devices (heart rate, blood pressure, thermometer, glucose meter) connect for real in
          Chrome or Edge. Mission hardware with its own link (Bio-Monitor, Actiwatch, ECG, dosimeter, ARED, PVT tablet) is simulated in this prototype:
          its readings come from the synthetic telemetry and are tagged SIM DEVICE.
        </>
      }
      actions={
        <Segmented<SyncInterval>
          label="Auto sync interval"
          value={state.settings.intervalMinutes}
          options={INTERVAL_OPTIONS}
          onChange={(v) => {
            const ok = sync.setInterval(v);
            toast({ tone: ok ? "success" : "warning", title: "Sync interval saved", body: ok ? `Every ${v === 60 ? "hour" : `${v} min`}.` : "Not saved: browser storage is unavailable." });
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {/* Coverage per indicator; doubles as the catalogue filter. */}
        <div role="group" aria-label="Filter devices by indicator" className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={`min-h-[32px] rounded-full border px-3 text-xs ${filter === "all" ? "border-cyan bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"}`}>
            All devices
          </button>
          {SYNC_METRICS.map((m) => {
            const n = coverage(m);
            return (
              <button key={m} type="button" aria-pressed={filter === m} onClick={() => setFilter(m)} className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-xs ${filter === m ? "border-cyan bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"}`}>
                {METRIC_GUIDANCE[m].shortName}
                <span className={`font-mono text-2xs ${n ? "text-nominal" : "text-ink-3"}`}>{n ? `${n} linked` : "none"}</span>
              </button>
            );
          })}
        </div>

        <section aria-labelledby="sync-paired">
          <h3 id="sync-paired" className="mb-2 flex items-center gap-2 font-cond text-xs font-bold uppercase tracking-label text-ink-2">
            Your devices <span className="font-mono text-ink-3">({state.settings.paired.length})</span>
          </h3>
          {state.settings.paired.length === 0 ? (
            <p className="rounded-tile border border-dashed border-line px-3 py-4 text-sm text-ink-3">No devices paired yet. Pick one below: it takes one press.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {state.settings.paired.map((p) => (
                <PairedCard key={p.deviceId} paired={p} link={state.links[p.deviceId]} bleBlocked={bleBlocked} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sync-add">
          <h3 id="sync-add" className="mb-2 flex flex-wrap items-center gap-2 font-cond text-xs font-bold uppercase tracking-label text-ink-2">
            Add a device
            {bleBlocked ? (
              <span className="inline-flex items-center gap-1 font-sans text-2xs font-normal normal-case tracking-normal text-caution">
                <BluetoothOff aria-hidden="true" className="h-3.5 w-3.5" />
                Bluetooth unavailable in this browser
              </span>
            ) : null}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {shown.map((d) => (
              <CatalogueCard key={d.id} spec={d} paired={pairedIds.has(d.id)} bleBlocked={bleBlocked} connecting={state.links[d.id]?.status === "connecting"} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="sync-log">
          <h3 id="sync-log" className="mb-2 font-cond text-xs font-bold uppercase tracking-label text-ink-2">
            Sync activity, this session
          </h3>
          {state.log.length === 0 ? (
            <p className="text-xs text-ink-3">Nothing synced in this session.</p>
          ) : (
            <ol className="max-h-56 divide-y divide-line-soft overflow-y-auto rounded-tile border border-line" aria-live="polite">
              {state.log.map((e) => (
                <li key={e.id} className="grid grid-cols-[52px_minmax(0,140px)_1fr] gap-2 px-3 py-1.5 text-xs">
                  <span className="font-mono tabular-nums text-ink-3">{e.at}</span>
                  <span className="truncate text-ink-2">{SYNC_DEVICE_BY_ID[e.deviceId]?.name ?? e.deviceId}</span>
                  <span className={e.ok ? "text-ink" : "text-caution"}>{e.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <p className="text-2xs text-ink-3">
          Device readings are prototype demonstrations, not a certified medical-device integration. Readings never leave this device.
        </p>
      </div>
    </Panel>
  );
}
