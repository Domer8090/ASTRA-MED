import { Activity, BellRing, BookOpen, CloudSun, LineChart, ListChecks, PersonStanding, RefreshCw, ShieldAlert } from "lucide-react";

export const NAV_ITEMS = [
  { id: "overview", label: "Medical console: crew health and body systems", short: "Console", icon: PersonStanding },
  { id: "hazards", label: "Five hazards of human spaceflight", short: "Hazards", icon: ShieldAlert },
  { id: "trends", label: "Trends", short: "Trends", icon: LineChart },
  { id: "countermeasures", label: "Countermeasures", short: "Tasks", icon: ListChecks },
  { id: "alerts", label: "Alerts and health events", short: "Alerts", icon: BellRing },
  { id: "sync", label: "Auto Sync: connect wearables and instruments", short: "Sync", icon: RefreshCw },
  { id: "weather", label: "Space Weather", short: "Weather", icon: CloudSun },
] as const;

export type SectionId = (typeof NAV_ITEMS)[number]["id"];

export const SOURCES_NAV = { label: "Data Sources / About", short: "Sources", icon: BookOpen } as const;
export const BRAND_ICON = Activity;

export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  // Some embedded or throttled browsers never finish a smooth scroll; land on the section anyway.
  window.setTimeout(() => {
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-offset")) || 0;
    if (Math.abs(el.getBoundingClientRect().top - offset) > 48) el.scrollIntoView({ behavior: "auto", block: "start" });
  }, 700);
  // Move focus for keyboard and screen-reader users without a second scroll.
  const heading = el.querySelector<HTMLElement>("h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}
