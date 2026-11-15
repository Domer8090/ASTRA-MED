import { setConsoleView } from "../hooks/useConsoleView";
import { scrollToSection } from "./navigation";
import { useEffect } from "react";
import { BODY_SYSTEM_IDS, type BodySystemId } from "../types/health";
import { useUiActions, type SourcesTab } from "../hooks/useUi";
import { isMetricId } from "../utils/validation";
import { useConsoleFocus } from "./console/useConsoleFocus";

const SECTIONS = new Set(["overview", "details", "hazards", "trends", "countermeasures", "alerts", "weather", "sync", "vitals", "body", "intel"]);
const DETAIL_ONLY = new Set(["vitals", "body"]);
const SOURCE_TABS = new Set<SourcesTab>(["about", "sources", "thresholds", "labels", "storage"]);

/**
 * Shareable links: #trends (scroll), #system-cardiovascular, #guide-heartRate,
 * #log-sleep, #sources or #sources-thresholds.
 */
export function DeepLinks() {
  const { openGuidance, openLog, openSources } = useUiActions();
  const { focusSystem } = useConsoleFocus();

  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!h) return;
      const [head, arg] = h.split(/-(.*)/s) as [string, string | undefined];
      if (SECTIONS.has(h)) {
        if (DETAIL_ONLY.has(h)) setConsoleView("details");
        window.setTimeout(() => scrollToSection(h), 150);
      } else if (head === "system" && arg && (BODY_SYSTEM_IDS as readonly string[]).includes(arg)) {
        focusSystem(arg as BodySystemId);
      } else if (head === "guide" && arg && isMetricId(arg)) {
        openGuidance({ kind: "metric", id: arg });
      } else if (head === "log") {
        openLog(arg && isMetricId(arg) ? { metricId: arg } : {});
      } else if (head === "sources") {
        openSources(arg && SOURCE_TABS.has(arg as SourcesTab) ? (arg as SourcesTab) : "about");
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [focusSystem, openGuidance, openLog, openSources]);

  return null;
}
