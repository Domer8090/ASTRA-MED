/**
 * What to do first when a crew member needs the medical officer, with and
 * without a ground link. Prototype guidance in the mission's medical language;
 * the mission-approved onboard checklists always take precedence.
 */
export const ONBOARD_FIRST: readonly string[] = [
  "Tell the crew medical officer on board and keep a crewmate with you.",
  "Stop the current task. Stay still, seated or restrained.",
  "Follow the mission-approved onboard medical checklist for what you feel. ASTRA-MED gives no diagnosis or treatment.",
];

export const NO_LINK_STEPS: readonly string[] = [
  "There is no ground link, so decisions are made on board until contact returns.",
  "Repeat your vital signs every 15 minutes and log each one. The console and this message update as you log.",
  "Write down when it started and anything that changes. Queue this message; hand it over at the next contact window.",
  "If you get worse, the crew medical officer leads, using the onboard checklists and medical kit.",
];

export const LINK_UP_NOTE =
  "Send this through the mission's messaging system. ASTRA-MED does not transmit anything; the answer takes at least twice the signal delay plus the medical officer's response time, so keep following the onboard steps meanwhile.";
