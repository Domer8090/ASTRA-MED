/**
 * Wellbeing content for Tuesday, the crew companion. Paraphrased from the
 * linked NASA Human Research Program pages (checked 2026-11-14). These are
 * coping supports, not treatment, and they never replace the mission's
 * behavioural-health support or the medical officer.
 */
import type { SourceRef } from "../types/health";

export const BEHAVIORAL_RISK: SourceRef = {
  label: "NASA HRP: Risk of Behavioral Conditions and Psychiatric Disorders",
  url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/",
};

export const TEAMWORK_RISK: SourceRef = {
  label: "NASA HRP: Risk of Inadequate Teamwork",
  url: "https://www.nasa.gov/reference/risk-of-inadequate-teamwork/",
};

export const GIBS_REF: SourceRef = {
  label: "NASA GIBS: Global Imagery Browse Services",
  url: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api",
};

export const EPIC_REF: SourceRef = {
  label: "NASA EPIC: Earth Polychromatic Imaging Camera on DSCOVR",
  url: "https://epic.gsfc.nasa.gov/about",
};

export interface WellbeingGuide {
  id: string;
  title: string;
  text: string;
  source: SourceRef | null;
}

export const WELLBEING_GUIDES: readonly WellbeingGuide[] = [
  {
    id: "isolation",
    title: "Isolation and confinement",
    text: "Long isolation and confinement can raise the risk of behavioural problems such as anxiety and low mood. Deep-space crews also lose quick contact with family and support on Earth because of the signal delay. Noticing changes early and keeping routines helps.",
    source: BEHAVIORAL_RISK,
  },
  {
    id: "windows",
    title: "Looking at Earth",
    text: "NASA notes that spacecraft windows can support crew mental health by reducing monotony and the feeling of confinement. Reminders of Earth, such as growing fresh plants, may also help. Tuesday's Earth view shows NASA imagery of Earth from the previous day.",
    source: BEHAVIORAL_RISK,
  },
  {
    id: "boredom",
    title: "Boredom and monotony",
    text: "Monotony is a known stressor on long missions. Short changes of activity help: a few minutes looking at Earth, a light game, a paced-breathing round, or a message recorded for family to send at the next communication window.",
    source: BEHAVIORAL_RISK,
  },
  {
    id: "fatigue",
    title: "Feeling tired",
    text: "Tiredness can come from short or broken sleep, a shifted schedule, heavy workload or illness. Log your sleep the same way each day, keep the planned sleep period, and avoid starting safety-critical work while very tired. If tiredness continues, note it for the medical officer.",
    source: { label: "NASA HRP: Risk from Inadequate Sleep and Irregular Schedules", url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" },
  },
  {
    id: "breathing",
    title: "Paced breathing",
    text: "A slow paced-breathing round (about six breaths a minute: breathe in for 4 seconds, out for 6) is a simple way to slow down for a few minutes. It is a relaxation exercise, not a treatment.",
    source: null,
  },
  {
    id: "crew",
    title: "Crew and teamwork",
    text: "Small crews living close together for a long time need good communication and conflict handling. Talk early with a crewmate or the behavioural-health contact when something feels wrong.",
    source: TEAMWORK_RISK,
  },
  {
    id: "support",
    title: "When to ask for help",
    text: "If low mood, hopelessness, panic or thoughts of self-harm appear, tell a crewmate now and contact the medical officer or behavioural-health support at the next communication window, or sooner by the mission's urgent channel. Tuesday is not a counsellor.",
    source: BEHAVIORAL_RISK,
  },
];
