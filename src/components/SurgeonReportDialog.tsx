import { useMemo } from "react";
import { Copy, Download } from "lucide-react";
import { earthMarsLightMinutes } from "../engine/lightTime";
import { buildSurgeonReport } from "../engine/reportEngine";
import { useMissionModel } from "../hooks/useMissionModel";
import { useToast } from "../hooks/useToast";
import { Dialog } from "./shared/Dialog";

/** Plain-text summary for the flight surgeon. Built and kept on this device; the crew decides how to send it. */
export function SurgeonReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMissionModel();
  const toast = useToast();
  const text = useMemo(
    () =>
      open
        ? buildSurgeonReport({
            day: m.day,
            scenario: m.scenario,
            overall: m.overall,
            systems: m.systems,
            diagnostics: m.diagnostics,
            trends: m.trends,
            advisories: m.advisories,
            followUps: m.followUps,
            readiness: m.readiness,
            days: m.days,
            generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
            signalDelayMinutes: earthMarsLightMinutes(new Date()),
            drift: m.drift,
          })
        : "",
    [open, m],
  );
  const fileName = `astra-med-day-${m.day}-surgeon-report.txt`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ tone: "success", title: "Report copied", body: "Paste it into the mission's medical channel when communication is available." });
    } catch {
      toast({ tone: "warning", title: "Report not copied", body: "This browser blocked the clipboard. Use Download instead." });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ tone: "success", title: "Report saved", body: `${fileName} was saved to this device.` });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Report for the flight surgeon"
      widthClass="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-3">Built on this device. Nothing is sent; you choose how to share it.</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => void copy()} data-autofocus>
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copy
            </button>
            <button type="button" className="btn btn-primary" onClick={download}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Download .txt
            </button>
          </div>
        </div>
      }
    >
      <p className="mb-2 text-sm text-ink-2">
        Status, out-of-range indicators with their rules, trend watches, hazards, follow-ups and the last 7 days of readings, ready to send when the link to Earth allows.
      </p>
      <pre className="num max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-tile border border-line bg-space p-3 text-xs leading-5 text-ink">{text}</pre>
    </Dialog>
  );
}
