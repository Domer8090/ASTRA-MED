import { Activity, BookOpen, CloudSun, HeartPulse, LayoutDashboard, LineChart, ListChecks, PersonStanding } from "lucide-react";

export const NAV_ITEMS = [
  { id: "overview", label: "Mission Overview", short: "Overview", icon: LayoutDashboard },
  { id: "vitals", label: "Crew Health", short: "Vitals", icon: HeartPulse },
  { id: "body", label: "Body Systems", short: "Body", icon: PersonStanding },
  { id: "trends", label: "Trends", short: "Trends", icon: LineChart },
  { id: "countermeasures", label: "Countermeasures", short: "Tasks", icon: ListChecks },
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
  // Move focus for keyboard and screen-reader users without a second scroll.
  const heading = el.querySelector<HTMLElement>("h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}
