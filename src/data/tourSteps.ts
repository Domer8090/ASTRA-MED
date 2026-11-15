/**
 * Spotlight tour started from the welcome card or About. Each step points at an
 * element marked with `data-tour="<target>"`. Steps whose target is hidden at
 * the current screen size are skipped.
 */
export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: "summary-status",
    title: "Start here every day",
    body: "One word tells you how today looks: NOMINAL, CAUTION or CRITICAL. The rings show your plan score, tasks done and exercise minutes.",
  },
  {
    target: "summary-top",
    title: "Top four today",
    body: "The four most important things right now, most urgent first: readings outside their range (with the range in big numbers), space weather, trends and tasks.",
  },
  {
    target: "summary-next",
    title: "Do this next",
    body: "The single most important step for today, with the reason behind it. Show me how opens a step-by-step guide.",
  },
  {
    target: "summary-readings",
    title: "Your readings",
    body: "Every reading with its date, value and range. Anything that needs a look comes first. Tap any reading to learn what it means and how to measure it.",
  },
  {
    target: "summary-tasks",
    title: "Today's tasks",
    body: "Tick tasks as you finish them. They feed your plan score but never change a health status.",
  },
  {
    target: "tuesday",
    title: "Tuesday, your companion",
    body: "Talk or type a reading, ask how you are doing, take a break, or contact the medical officer, with or without a link to Earth.",
  },
] as const;
