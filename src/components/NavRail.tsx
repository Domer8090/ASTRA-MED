import { useEffect, useState } from "react";
import { Info, Stethoscope } from "lucide-react";
import { useUiActions } from "../hooks/useUi";
import { BrandMark } from "./BrandMark";
import { MEDICAL_OFFICER_HASH } from "../hooks/useView";
import { NAV_ITEMS, scrollToSection, SOURCES_NAV, type SectionId } from "./navigation";

/**
 * Every section that occupies the reading area counts as current, so side-by-side
 * panels (Tasks and Alerts on wide screens) light up together.
 */
function useActiveSections(): ReadonlySet<SectionId> {
  const [active, setActive] = useState<ReadonlySet<SectionId>>(() => new Set<SectionId>(["overview"]));
  useEffect(() => {
    const els = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter((e): e is HTMLElement => Boolean(e));
    const inView = new Set<SectionId>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id as SectionId;
          if (e.isIntersecting) inView.add(id);
          else inView.delete(id);
        }
        // Keep the last highlight while scrolling through a gap between sections.
        if (inView.size) setActive(new Set(inView));
      },
      { rootMargin: "-160px 0px -40% 0px", threshold: 0 },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, []);
  return active;
}

export function NavRail() {
  const active = useActiveSections();
  const { openSources } = useUiActions();
  const SourcesIcon = SOURCES_NAV.icon;
  return (
    <>
      <nav aria-label="Console sections" className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col border-r border-line bg-space lg:flex">
        <a href="#overview" className="flex h-[var(--topbar-h)] items-center justify-center border-b border-line" aria-label="ASTRA-MED, go to mission overview" onClick={(e) => { e.preventDefault(); scrollToSection("overview"); }}>
          <BrandMark />
        </a>
        <ul className="flex flex-1 flex-col gap-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const current = active.has(item.id);
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  title={item.label}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-tile px-1 py-2 text-center font-cond text-2xs font-semibold transition-colors duration-150 ${
                    current ? "bg-raised text-cyan" : "text-ink-2 hover:bg-raised/60 hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  {item.short}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-1 border-t border-line px-2 py-3">
          <a
            href={MEDICAL_OFFICER_HASH}
            title="Ground dashboard for the medical officer"
            className="flex w-full flex-col items-center gap-1 rounded-tile px-1 py-2 text-center font-cond text-2xs font-semibold text-ink-2 transition-colors duration-150 hover:bg-raised/60 hover:text-ink"
          >
            <Stethoscope aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
            Medical officer
          </a>
          <button
            type="button"
            onClick={() => openSources("about")}
            title="Overview: the problem, how ASTRA-MED works and its NASA data"
            className="flex w-full flex-col items-center gap-1 rounded-tile px-1 py-2 font-cond text-2xs font-semibold text-ink-2 transition-colors duration-150 hover:bg-raised/60 hover:text-ink"
          >
            <Info aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
            Overview
          </button>
          <button
            type="button"
            onClick={() => openSources("sources")}
            title={SOURCES_NAV.label}
            className="flex w-full flex-col items-center gap-1 rounded-tile px-1 py-2 font-cond text-2xs font-semibold text-ink-2 transition-colors duration-150 hover:bg-raised/60 hover:text-ink"
          >
            <SourcesIcon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
            {SOURCES_NAV.short}
          </button>
        </div>
      </nav>

      <nav aria-label="Console sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-space pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const current = active.has(item.id);
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 font-cond text-[10.5px] font-semibold ${current ? "text-cyan" : "text-ink-2"}`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  {item.short}
                </a>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => openSources("about")} className="flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 font-cond text-[10.5px] font-semibold text-ink-2">
              <Info aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              About
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
