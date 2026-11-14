/**
 * Plain-English measurement guidance for each metric.
 * Educational prototype content. It does not replace mission-approved
 * procedures, device instructions or advice from qualified medical personnel.
 */
import type { MetricGuidance, MetricId, SourceRef } from "../types/health";

const FITNESS_RISK: SourceRef = {
  label: "NASA HRP: Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness",
  url: "https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/",
};
const SLEEP_RISK: SourceRef = {
  label: "NASA HRP: Risk from Inadequate Sleep and Irregular Schedules",
  url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
};
const SANS_RISK: SourceRef = {
  label: "NASA HRP: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)",
  url: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
};
const MSL_RAD: SourceRef = {
  label: "Zeitlin et al. 2013, Science 340:1080 (MSL/RAD cruise dose, about 1.8 mSv/day)",
  url: "https://doi.org/10.1126/science.1235989",
};

export const GUIDANCE_DISCLAIMER =
  "Educational prototype content. These steps do not replace mission-approved procedures, device instructions or advice from qualified medical personnel.";

export const METRIC_GUIDANCE: Record<MetricId, MetricGuidance> = {
  heartRate: {
    metricId: "heartRate",
    name: "Resting heart rate",
    shortName: "Heart rate",
    unit: "bpm",
    whatItMeasures: "How many times your heart beats per minute while you are at rest.",
    whyItMatters:
      "Resting heart rate is a simple daily signal of cardiovascular adaptation, recovery, hydration and stress.",
    deviceRequired: "Mission-approved heart-rate monitor or the pulse reading of the blood-pressure cuff.",
    howToMeasure: [
      "Measure at the same time each day, before exercise or caffeine where possible.",
      "Stabilize yourself in a seated or restrained position and rest for the protocol-defined period.",
      "Attach the sensor as the device instructions describe and stay still while it reads.",
      "Record the value. Repeat once if the device reports an error or the number looks unexpected.",
    ],
    microgravityEffects:
      "Fluids shift toward the upper body and the cardiovascular system adapts over the first weeks. Exercise, stress, sleep loss, illness and medication timing also change the reading.",
    whenToRepeat:
      "Repeat after the rest period if the reading is outside the configured range, if the device flagged an error, or if you feel unwell.",
    whatToRecord: ["Value in bpm", "Time and posture", "Recent exercise or caffeine", "Any symptoms"],
    nextStep:
      "If a repeated reading stays outside the configured range, follow the mission-approved cardiovascular protocol and note it for the medical officer.",
    trendTab: "heartRate",
    system: "cardiovascular",
    reference: FITNESS_RISK,
  },
  bloodPressure: {
    metricId: "bloodPressure",
    name: "Blood pressure",
    shortName: "Blood pressure",
    unit: "mmHg",
    whatItMeasures:
      "The pressure in your arteries when the heart beats (systolic) and between beats (diastolic).",
    whyItMatters:
      "Blood pressure shows how the cardiovascular system is coping with fluid redistribution and deconditioning.",
    deviceRequired: "Mission-approved automated blood-pressure cuff of the correct size.",
    howToMeasure: [
      "Secure the device and follow its instructions.",
      "Use the same posture and conditions as previous readings.",
      "Rest for the protocol-defined period before measuring.",
      "Position the cuff on the upper arm as instructed, at heart level, and stay still and quiet.",
      "Take the reading. Repeat if the device reports an error or the result is unexpected.",
      "Record both numbers, posture, time and any symptoms.",
    ],
    microgravityEffects:
      "Fluid shifts toward the head and changes in blood volume alter pressure readings. Restraint position, cuff placement and recent exercise change results too.",
    whenToRepeat:
      "Repeat once after rest if either number is outside the configured range or the device flags an error.",
    whatToRecord: ["Systolic and diastolic (mmHg)", "Posture and arm used", "Time", "Symptoms such as headache or dizziness"],
    nextStep:
      "If repeated readings stay outside the configured range, review the mission-approved cardiovascular protocol and record the readings for the flight surgeon.",
    trendTab: "bloodPressure",
    system: "cardiovascular",
    reference: FITNESS_RISK,
  },
  bloodGlucose: {
    metricId: "bloodGlucose",
    name: "Blood glucose",
    shortName: "Glucose",
    unit: "mg/dL",
    whatItMeasures: "The amount of sugar in a small blood sample.",
    whyItMatters:
      "Glucose reflects how the body is handling food, sleep, activity and stress, which all change on long missions.",
    deviceRequired: "Mission-approved glucometer, test strips and lancet.",
    howToMeasure: [
      "Confirm the glucometer, strips and lancet are the approved supplies and in date.",
      "Follow the device instructions and the mission timing protocol (for example fasting or after a meal).",
      "Clean the sampling site, take the sample and apply it to the strip as instructed.",
      "Record the value and whether it was fasting, post-meal or other.",
    ],
    microgravityEffects:
      "Altered sleep, meal timing, reduced loading and stress can change glucose. The reading only makes sense with its timing context.",
    whenToRepeat:
      "Repeat at the next protocol time point, or sooner if the value is outside the configured range or the strip shows an error.",
    whatToRecord: ["Value in mg/dL", "Fasting, post-meal or other", "Time of last meal", "Any symptoms"],
    nextStep: "Follow the mission-approved protocol for unusual results and note the timing context.",
    trendTab: "bloodGlucose",
    system: "metabolicCircadian",
    reference: null,
  },
  bodyTemperature: {
    metricId: "bodyTemperature",
    name: "Body temperature",
    shortName: "Temperature",
    unit: "°C",
    whatItMeasures: "Your body temperature at the measurement site used by the mission thermometer.",
    whyItMatters:
      "A raised temperature can be an early sign of illness. Spacecraft cabins make heat loss slightly different from Earth.",
    deviceRequired: "Mission-approved thermometer.",
    howToMeasure: [
      "Use the approved thermometer and the same measurement site each time.",
      "Avoid measuring straight after exercise or a warm drink.",
      "Follow the device instructions for placement and reading time.",
      "Record the value and the site used.",
    ],
    microgravityEffects:
      "Without convection, heat leaves the body more slowly. Exercise and cabin temperature change readings.",
    whenToRepeat: "Repeat after 30 minutes at rest if the value is outside the configured range.",
    whatToRecord: ["Value in °C", "Measurement site", "Recent exercise", "Symptoms such as chills or fatigue"],
    nextStep:
      "If a repeated reading stays outside the configured range, record symptoms and follow the mission-approved illness protocol.",
    trendTab: "bodyTemperature",
    system: "metabolicCircadian",
    reference: null,
  },
  sleep: {
    metricId: "sleep",
    name: "Daily sleep",
    shortName: "Sleep",
    unit: "h",
    whatItMeasures: "How long you slept in your last sleep period.",
    whyItMatters:
      "Short sleep across several days can reduce attention and reaction time, which matters for safety-critical work.",
    deviceRequired: "Sleep log entry, or an approved actigraphy device where the mission provides one.",
    howToMeasure: [
      "Note the time you went to sleep and the time you woke.",
      "Subtract any long awakenings you remember.",
      "Enter the total in hours, using the same method each day.",
    ],
    microgravityEffects:
      "Light-dark cycles, noise, schedule shifts and workload all disrupt sleep timing on a spacecraft.",
    whenToRepeat: "Log once per sleep period.",
    whatToRecord: ["Total hours", "Sleep and wake times", "Disturbances", "Use of any approved sleep aid"],
    nextStep:
      "If sleep stays short for consecutive days, review the approved sleep routine and the schedule with the medical officer.",
    trendTab: "sleepMood",
    system: "neuroOcular",
    reference: SLEEP_RISK,
  },
  mood: {
    metricId: "mood",
    name: "Mood check-in",
    shortName: "Mood",
    unit: "/ 5",
    whatItMeasures: "A self-rated score from 1 (very low) to 5 (very good) using the same scale each day.",
    whyItMatters:
      "Isolation, confinement and workload affect wellbeing. A persistent change is more meaningful than one low day.",
    deviceRequired: "None. Use the mission's standard self-report scale.",
    howToMeasure: [
      "Rate your overall mood for the day on the 1–5 scale.",
      "Use the same time of day and the same scale every day.",
      "Add a short note if something specific affected it.",
    ],
    microgravityEffects:
      "Confinement, distance from home, sleep loss and workload can lower mood over a long mission.",
    whenToRepeat: "Once per day.",
    whatToRecord: ["Score 1–5", "Optional note"],
    nextStep:
      "If scores stay low for several days, use the mission's approved behavioural-health resources and talk with the medical officer when communication is available.",
    trendTab: "sleepMood",
    system: "metabolicCircadian",
    reference: SLEEP_RISK,
  },
  aredMinutes: {
    metricId: "aredMinutes",
    name: "ARED resistive exercise",
    shortName: "ARED",
    unit: "min",
    whatItMeasures:
      "Minutes of resistive exercise completed on the Advanced Resistive Exercise Device (ARED) today.",
    whyItMatters:
      "Reduced mechanical loading contributes to bone and muscle loss. Resistive exercise is a key countermeasure. Minutes show adherence; they do not measure bone density.",
    deviceRequired: "ARED or the mission's approved resistive exercise device.",
    howToMeasure: [
      "Review the scheduled exercise plan for today.",
      "Inspect the equipment and confirm it is ready.",
      "Complete only the assigned session.",
      "Record completed minutes and any equipment problem or discomfort.",
    ],
    microgravityEffects:
      "Without gravity, bones and muscles carry less load. Equipment availability and schedule changes affect sessions.",
    whenToRepeat: "Log after each session.",
    whatToRecord: ["Minutes completed", "Exercises completed", "Equipment issues", "Discomfort"],
    nextStep:
      "Do not increase intensity or duration based on this app. Follow the approved exercise plan and report missed sessions.",
    trendTab: "ared",
    system: "musculoskeletal",
    reference: FITNESS_RISK,
  },
  radiation: {
    metricId: "radiation",
    name: "Cumulative radiation dose",
    shortName: "Radiation",
    unit: "mSv",
    whatItMeasures:
      "Your personal dosimeter's cumulative dose for the mission, and the change since the previous day.",
    whyItMatters:
      "Exposure accumulates over the mission. Only a dosimeter or a validated mission model gives a personal dose value.",
    deviceRequired: "Personal dosimeter assigned by the mission.",
    howToMeasure: [
      "Review the current dosimeter reading and its timestamp.",
      "Confirm the reading is current and from your assigned device.",
      "Enter the cumulative value exactly as displayed.",
    ],
    microgravityEffects:
      "Outside Earth's magnetosphere, galactic cosmic rays give a steady dose and solar particle events can add more. Shielding and location in the vehicle change exposure.",
    whenToRepeat: "Once per day, and during any space-weather alert as the mission procedure directs.",
    whatToRecord: ["Cumulative mSv", "Device ID", "Location in the vehicle", "Any shelter actions taken"],
    nextStep:
      "Review the space-weather status. Follow the approved radiation protection and shelter procedure when directed.",
    trendTab: "radiation",
    system: "immuneRadiation",
    reference: MSL_RAD,
  },
  pvt: {
    metricId: "pvt",
    name: "PVT reaction time",
    shortName: "PVT",
    unit: "ms",
    whatItMeasures:
      "Mean reaction time on the Psychomotor Vigilance Test, a short task where you respond to a light or signal.",
    whyItMatters: "Slower reaction time can reveal fatigue from sleep loss or workload before you notice it.",
    deviceRequired: "Mission-approved PVT application or device.",
    howToMeasure: [
      "Choose a quiet moment and stabilize yourself.",
      "Run the scheduled PVT session to completion without interruptions.",
      "Record the mean reaction time the device reports.",
    ],
    microgravityEffects: "Sleep disruption, circadian shifts and workload can slow reaction time.",
    whenToRepeat: "At the scheduled interval (every third day in this demo plan).",
    whatToRecord: ["Mean reaction time (ms)", "Lapses if reported", "Time of day"],
    nextStep: "If reaction time stays slower than your baseline, review sleep and workload with the medical officer.",
    trendTab: "pvtHydration",
    system: "neuroOcular",
    reference: SLEEP_RISK,
  },
  hydration: {
    metricId: "hydration",
    name: "Hydration",
    shortName: "Hydration",
    unit: "L",
    whatItMeasures: "Total fluid you drank today.",
    whyItMatters: "Fluid intake supports cardiovascular adaptation, kidney health and temperature control.",
    deviceRequired: "Drink-bag volume markings or the mission's fluid log.",
    howToMeasure: [
      "Add up the volume of each drink bag or container you finished.",
      "Enter the total in litres at the end of the day.",
    ],
    microgravityEffects: "Thirst is weaker in microgravity, so intake can fall without you noticing.",
    whenToRepeat: "Once per day.",
    whatToRecord: ["Total litres", "Anything unusual such as illness"],
    nextStep: "If intake stays below the mission plan, review the hydration plan.",
    trendTab: "pvtHydration",
    system: "metabolicCircadian",
    reference: null,
  },
  symptoms: {
    metricId: "symptoms",
    name: "Neuro-ocular symptom check",
    shortName: "Vision check",
    unit: "",
    whatItMeasures: "Whether you notice blurred vision, eye pressure, headache or another new symptom.",
    whyItMatters:
      "Fluid shifts toward the head can affect the eyes and vision. New or worsening symptoms need recording and review. This check cannot diagnose SANS.",
    deviceRequired: "The mission's vision-check card or approved vision device.",
    howToMeasure: [
      "Sit or stabilize yourself in a safe position.",
      "Use the supplied vision-check card or approved mission device.",
      "Test each eye separately if the protocol calls for it.",
      "Record blurred vision, pressure sensation, headache or other symptoms.",
      "Compare with prior checks and follow the mission protocol if symptoms are new or worsening.",
    ],
    microgravityEffects: "Headward fluid shift can change ocular structures over long missions.",
    whenToRepeat: "At the scheduled interval (weekly in this demo plan) and whenever symptoms change.",
    whatToRecord: ["Each symptom reported", "Which eye", "When it started"],
    nextStep: "If a symptom is new or worsening, follow the mission protocol and note it for the medical officer.",
    trendTab: null,
    system: "neuroOcular",
    reference: SANS_RISK,
  },
};
