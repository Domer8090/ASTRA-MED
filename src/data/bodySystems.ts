/**
 * Body-system reference content for the interactive body map.
 * Educational prototype content; not a diagnostic or clinical reference.
 */
import type { BodySystemDefinition, BodySystemId } from "../types/health";

export const BODY_SYSTEMS: Record<BodySystemId, BodySystemDefinition> = {
  neuroOcular: {
    id: "neuroOcular",
    name: "Brain & Eyes / Neuro-Ocular",
    shortName: "Neuro-ocular",
    metrics: ["sleep", "pvt", "symptoms"],
    whyItMatters:
      "Vision, attention and reaction time support every safety-critical task on board.",
    inSpace: [
      "Fluid shifts toward the head can affect ocular structures and vision.",
      "Spaceflight-associated neuro-ocular concerns require appropriate monitoring by the mission medical team.",
      "Sleep disruption and workload can affect attention and cognitive performance.",
    ],
    relevantMeasurements: ["Vision and symptom check", "Sleep duration", "PVT reaction time", "Headache or visual symptom log"],
    selfCheckSteps: [
      "Sit or stabilize yourself in a safe position.",
      "Use the supplied vision-check card or approved mission device.",
      "Test each eye separately if the protocol calls for it.",
      "Record blurred vision, pressure sensation, headache or other symptoms.",
      "Compare with prior readings and follow the mission protocol if symptoms are new or worsening.",
    ],
    deviceRequired: "Vision-check card or approved vision device; PVT application.",
    caveat: "A simple self-check does not diagnose spaceflight-associated neuro-ocular syndrome (SANS).",
    trendTab: "sleepMood",
    nominalNextStep: "Complete the scheduled PVT and vision checks and keep logging sleep.",
  },
  cardiovascular: {
    id: "cardiovascular",
    name: "Cardiovascular",
    shortName: "Cardiovascular",
    metrics: ["heartRate", "bloodPressure"],
    whyItMatters:
      "Heart and blood vessels adapt to weightlessness, which affects how the body responds to exertion and to returning to gravity.",
    inSpace: [
      "Microgravity redistributes body fluids toward the upper body.",
      "Cardiovascular adaptation and deconditioning may change heart-rate and blood-pressure responses.",
      "Reconditioning and hydration plans are mission-specific.",
    ],
    relevantMeasurements: [
      "Resting heart rate",
      "Blood pressure",
      "Orthostatic or exercise-response measures, only if the mission protocol supports them",
    ],
    selfCheckSteps: [
      "Secure the measurement device and follow its instructions.",
      "Use the same posture and measurement conditions where possible.",
      "Rest for the protocol-defined period.",
      "Position the cuff as instructed and take the reading.",
      "Repeat if the device reports an error or the result is unexpected.",
      "Record posture, time, symptoms and the measurement.",
    ],
    deviceRequired: "Automated blood-pressure cuff; heart-rate monitor.",
    caveat: "Readings outside the configured range need repeating and protocol review; they are not a diagnosis.",
    trendTab: "heartRate",
    nominalNextStep: "Keep the daily resting measurement at the same time and posture.",
  },
  musculoskeletal: {
    id: "musculoskeletal",
    name: "Musculoskeletal / Bone",
    shortName: "Musculoskeletal",
    metrics: ["aredMinutes"],
    whyItMatters:
      "Bone and muscle strength determine how safely crew can work, perform an emergency egress and readapt after landing.",
    inSpace: [
      "Reduced mechanical loading can contribute to bone and muscle loss.",
      "Resistive exercise is an important countermeasure.",
      "Exercise adherence and trends are useful context, but they do not directly measure bone density.",
    ],
    relevantMeasurements: [
      "ARED minutes and completed sessions",
      "Exercise adherence over the week",
      "Strength or bone-health measures only when supported by an approved device and protocol",
    ],
    selfCheckSteps: [
      "Review the scheduled exercise plan.",
      "Inspect equipment readiness.",
      "Complete only the assigned session.",
      "Record completed minutes and any equipment or discomfort issue.",
      "Do not increase intensity or duration based on app suggestions alone.",
    ],
    deviceRequired: "ARED or the mission's approved resistive exercise device.",
    caveat: "Exercise minutes describe adherence, not bone density or muscle mass.",
    trendTab: "ared",
    nominalNextStep: "Complete today's assigned resistive session and log the minutes.",
  },
  immuneRadiation: {
    id: "immuneRadiation",
    name: "Immune & Radiation",
    shortName: "Immune & radiation",
    metrics: ["radiation"],
    whyItMatters:
      "Radiation exposure and spaceflight stressors are relevant to immune function and long-term health.",
    inSpace: [
      "Spaceflight stressors and radiation exposure are relevant to immune function.",
      "Solar particle events may require mission-specific radiation protection actions.",
      "A space-weather event is not the same thing as a measured personal radiation dose.",
    ],
    relevantMeasurements: [
      "Cumulative dosimeter dose",
      "Daily dose change from the dosimeter",
      "NASA DONKI solar flares, SEP events, CMEs and notifications (environmental context)",
      "Symptoms or immune measurements only from an approved instrument or protocol",
    ],
    selfCheckSteps: [
      "Review the current dosimeter reading and timestamp.",
      "Confirm that the measurement is current and from the expected device.",
      "Review the mission space-weather alert.",
      "Follow the approved radiation protection and shelter procedure when directed.",
      "Record the event and any required crew actions.",
    ],
    deviceRequired: "Personal dosimeter; mission space-weather alert feed.",
    caveat:
      "ASTRA-MED never converts a flare class or DONKI event into a personal dose. Forecast hazard and measured exposure are shown separately.",
    trendTab: "radiation",
    nominalNextStep: "Review the dosimeter reading and the space-weather monitor once per day.",
  },
  metabolicCircadian: {
    id: "metabolicCircadian",
    name: "Metabolic & Circadian",
    shortName: "Metabolic & circadian",
    metrics: ["bloodGlucose", "bodyTemperature", "mood", "hydration", "sleep"],
    whyItMatters:
      "Energy, temperature regulation, mood and daily rhythm affect performance and recovery across the whole mission.",
    inSpace: [
      "Altered light-dark cues and mission schedules can disrupt circadian timing.",
      "Sleep, nutrition, hydration and workload can influence metabolic indicators.",
      "Glucose values require context such as timing and the mission's measurement protocol.",
    ],
    relevantMeasurements: ["Blood glucose", "Sleep duration", "Mood", "Hydration", "Temperature"],
    selfCheckSteps: [
      "Confirm the correct measurement device and supplies.",
      "Follow the device instructions and mission timing protocol.",
      "Record whether the reading was fasting, post-meal or otherwise contextualized if relevant.",
      "Record sleep and mood using the same scale each day.",
      "Follow the approved protocol for unusual results.",
    ],
    deviceRequired: "Glucometer and strips; thermometer; fluid log.",
    caveat: "Single readings need timing context. Look at the trend before drawing conclusions.",
    trendTab: "bloodGlucose",
    nominalNextStep: "Keep the daily check-in, hydration log and scheduled glucose checks.",
  },
};
