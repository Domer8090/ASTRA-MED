import { Activity, BookOpen, CloudSun, Globe2, LayoutGrid, ListChecks, PersonStanding } from "lucide-react";
import { getConsoleView, setConsoleView } from "../hooks/useConsoleView";

/** Five places, plain names. Everything else lives inside Details. */
export const NAV_ITEMS = [
  { id: "overview", label: "Today: your health summary", short: "Today", icon: PersonStanding },
  { id: "details", label: "Details: body systems, readings, trends, alerts and devices", short: "Details", icon: LayoutGrid },
  { id: "countermeasures", label: "Health tasks", short: "Tasks", icon: ListChecks },
  { id: "weather", label: "Space weather", short: "Weather", icon: CloudSun },
] as const;

/** Sections that only exist in the Details view. Navigating to one opens Details first. */
const DETAIL_SECTIONS = new Set(["details", "trends", "hazards", "countermeasures", "alerts", "sync", "weather", "intel"]);

export type SectionId = (typeof NAV_ITEMS)[number]["id"];

/** Opens the Recharge space: Earth view, Orbit Catch game and paced breathing. */
export const RECHARGE_NAV = { label: "Recharge: Earth view, Orbit Catch game and breathing", short: "Recharge", icon: Globe2 } as const;

export const SOURCES_NAV = { label: "About this demo and data sources", short: "About", icon: BookOpen } as const;
export const BRAND_ICON = Activity;

export function scrollToSection(id: string): void {
  if (DETAIL_SECTIONS.has(id) && getConsoleView() !== "details") {
    setConsoleView("details");
    // Wait for Details to render, then scroll.
    window.setTimeout(() => scrollToSection(id), 60);
    return;
  }
  if (id === "overview" && getConsoleView() === "details") setConsoleView("summary");
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
