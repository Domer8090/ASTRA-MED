var AstraCoreBundle = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// src/config/thresholds.ts
	var HEART_RATE = {
		unit: "bpm",
		reference: {
			min: 50,
			max: 68
		},
		cautionAbove: 85,
		cautionBelow: 45,
		criticalAbove: 105,
		provenance: "supplied-prototype",
		entry: {
			min: 25,
			max: 220
		},
		staleAfterDays: 2
	};
	var BLOOD_PRESSURE = {
		unit: "mmHg",
		reference: {
			systolic: {
				min: 110,
				max: 125
			},
			diastolic: {
				min: 70,
				max: 80
			}
		},
		cautionAbove: {
			systolic: 135,
			diastolic: 85
		},
		cautionBelow: {
			systolic: 95,
			diastolic: 60
		},
		criticalAbove: {
			systolic: 150,
			diastolic: 95
		},
		criticalBelow: {
			systolic: 85,
			diastolic: 55
		},
		provenance: "supplied-prototype",
		entry: {
			systolic: {
				min: 60,
				max: 260
			},
			diastolic: {
				min: 30,
				max: 160
			}
		},
		staleAfterDays: 2
	};
	var BODY_TEMPERATURE = {
		unit: "°C",
		reference: {
			min: 36.6,
			max: 37.5
		},
		cautionAtOrAbove: 37.6,
		criticalAtOrAbove: 38.2,
		provenance: "supplied-prototype",
		/** Not in the supplied table. Added so a low reading is not silently nominal. */
		cautionBelow: 36,
		cautionBelowProvenance: "astra-assumption",
		entry: {
			min: 32,
			max: 43
		},
		staleAfterDays: 2
	};
	var BLOOD_GLUCOSE = {
		unit: "mg/dL",
		reference: {
			min: 75,
			max: 105
		},
		cautionAtOrAbove: 110,
		cautionBelow: 68,
		criticalAtOrAbove: 140,
		criticalBelow: 55,
		provenance: "supplied-prototype",
		entry: {
			min: 20,
			max: 600
		},
		staleAfterDays: 3
	};
	var SLEEP = {
		unit: "h",
		reference: {
			min: 6,
			max: 7.5
		},
		/** Below this for `cautionPersistenceDays` consecutive days is CAUTION (5.0–5.9 for 2+ days in the table). */
		cautionBelow: 6,
		cautionPersistenceDays: 2,
		criticalBelow: 4.5,
		provenance: "supplied-prototype",
		/** Not in the supplied table: one night between 4.5 and 5.0 h is CAUTION on its own. */
		singleNightCautionBelow: 5,
		singleNightProvenance: "astra-assumption",
		entry: {
			min: 0,
			max: 16
		},
		staleAfterDays: 2
	};
	var MOOD = {
		unit: "/ 5",
		reference: {
			min: 3.5,
			max: 5
		},
		cautionAtOrBelow: 2.5,
		cautionPersistenceDays: 3,
		criticalAtOrBelow: 1.5,
		provenance: "supplied-prototype",
		entry: {
			min: 1,
			max: 5
		},
		staleAfterDays: 2
	};
	var ARED = {
		unit: "min",
		/** Demo target only (PROMPT.md §13.1). Editable in Settings; mission protocol sets the real plan. */
		defaultTargetMinutes: 60,
		targetProvenance: "mission-plan",
		/** A session below this fraction of target counts as missed. */
		missedFraction: .5,
		/** CRITICAL when at least this many sessions were missed in the trailing window. */
		criticalMissedSessions: 3,
		criticalWindowDays: 7,
		ruleProvenance: "astra-assumption",
		entry: {
			min: 0,
			max: 240
		},
		staleAfterDays: 2
	};
	var RADIATION = {
		unit: "mSv",
		/** Daily dose above this multiple of the trailing median is an "unusual daily increase" (CAUTION). */
		unusualDailyFactor: 2,
		trailingWindowDays: 14,
		ruleProvenance: "astra-assumption",
		/**
		* Cumulative mission dose limit in mSv, adjustable with a slider from 50 to
		* 2000 mSv. At or above it is CRITICAL; from `cautionFraction` of it is
		* CAUTION. Default 600 mSv, the size of NASA's published career limit
		* (NASA-STD-3001), used here only as a demo default, not as a flight rule.
		*/
		limit: {
			min: 50,
			max: 2e3,
			step: 10,
			default: 600
		},
		cautionFraction: .8,
		limitProvenance: "astra-assumption",
		/** Daily dose entry bounds for a cumulative dosimeter reading delta. */
		entry: {
			min: 0,
			max: 5e3
		},
		staleAfterDays: 2
	};
	var PVT = {
		unit: "ms",
		/**
		* In-range band for mean reaction time. Outside it is CAUTION. Each end is
		* adjustable with a slider within `sliderBounds`.
		*/
		range: {
			min: 200,
			max: 300
		},
		sliderBounds: {
			min: 150,
			max: 500,
			step: 5
		},
		/** Baseline is the crew member's median over mission days 1–14. */
		baselineDays: 14,
		/** CAUTION when mean reaction time exceeds baseline by this fraction on consecutive checks. */
		cautionSlowerFraction: .15,
		cautionPersistenceChecks: 2,
		provenance: "astra-assumption",
		entry: {
			min: 100,
			max: 2e3
		},
		staleAfterDays: 5
	};
	var HYDRATION = {
		unit: "L",
		/** Demo plan only; the mission nutrition plan sets the real target. */
		defaultTargetLiters: 2,
		targetProvenance: "mission-plan",
		cautionPersistenceDays: 2,
		ruleProvenance: "astra-assumption",
		entry: {
			min: 0,
			max: 8
		},
		staleAfterDays: 2
	};
	var SYMPTOMS = {
		/** Any reported neuro-ocular symptom within this many days is CAUTION until reviewed. */
		lookbackDays: 3,
		provenance: "astra-assumption",
		staleAfterDays: 10
	};
	var COUNTERMEASURES = {
		/** A day counts toward the streak when at least this fraction of tasks is complete. */
		streakMinCompletion: .8,
		provenance: "astra-assumption"
	};
	var MISSION = {
		name: "ARES TRANSIT — DEMO MISSION",
		shortName: "ARES TRANSIT",
		totalDays: 180,
		crewId: "FE-2",
		crewLabel: "Flight Engineer 2 (demo identity)",
		/** Mission day 1 begins at this UTC instant. Used only to stamp synthetic readings. */
		epochUtc: "2026-05-04T00:00:00Z",
		defaultDay: 42
	};
	/**
	* Trend watch: an early-warning projection for indicators that are still
	* NOMINAL. A least-squares line through the last `windowDays` readings is
	* extended forward; if it reaches a caution limit within `horizonDays` and
	* the fit is good enough, the console shows TREND WATCH. It never changes a
	* health status. All values here are ASTRA assumptions.
	*/
	var TREND_WATCH = {
		windowDays: 7,
		minReadings: 5,
		horizonDays: 7,
		/** Minimum R² of the fitted line; noisier series are ignored. */
		minFit: .5,
		/** Sleep has no band between reference and caution, so watch starts below this. */
		sleepWatchBelow: 6.5,
		provenance: "astra-assumption"
	};
	/**
	* Baseline drift (Isolation Forest). Learns this astronaut's own pattern from
	* earlier mission days and scores how unusual recent days look together.
	* A drift score is an early-warning cue only and never changes a status.
	*/
	var BASELINE_DRIFT = {
		/** Days that define the personal baseline (mean and spread per feature). */
		baselineDays: 14,
		/** Recent days scored against the model; excluded from training. */
		recentDays: 7,
		/** Most recent training days used, to follow slow, expected adaptation. */
		maxTrainingDays: 60,
		minTrainingDays: 14,
		trees: 120,
		sampleSize: 32,
		/** Isolation Forest score above which a day counts as unusual (0.5 is average). */
		unusualScore: .6,
		/** Unusual days needed within the recent window to raise a drift cue. */
		minUnusualDays: 3,
		/** A feature is named as a driver when its recent mean sits this many baseline SDs away. */
		driverZ: 1.5,
		seed: 20261114,
		provenance: "astra-assumption"
	};
	// src/data/bodySystems.ts
	var BODY_SYSTEMS = {
		neuroOcular: {
			id: "neuroOcular",
			name: "Brain & Eyes / Neuro-Ocular",
			shortName: "Neuro-ocular",
			metrics: [
				"sleep",
				"pvt",
				"symptoms"
			],
			whyItMatters: "Vision, attention and reaction time support every safety-critical task on board.",
			inSpace: [
				"Fluid shifts toward the head can affect ocular structures and vision.",
				"Spaceflight-associated neuro-ocular concerns require appropriate monitoring by the mission medical team.",
				"Sleep disruption and workload can affect attention and cognitive performance."
			],
			relevantMeasurements: [
				"Vision and symptom check",
				"Sleep duration",
				"PVT reaction time",
				"Headache or visual symptom log"
			],
			selfCheckSteps: [
				"Sit or stabilize yourself in a safe position.",
				"Use the supplied vision-check card or approved mission device.",
				"Test each eye separately if the protocol calls for it.",
				"Record blurred vision, pressure sensation, headache or other symptoms.",
				"Compare with prior readings and follow the mission protocol if symptoms are new or worsening."
			],
			deviceRequired: "Vision-check card or approved vision device; PVT application.",
			caveat: "A simple self-check does not diagnose spaceflight-associated neuro-ocular syndrome (SANS).",
			trendTab: "sleepMood",
			nominalNextStep: "Complete the scheduled PVT and vision checks and keep logging sleep."
		},
		cardiovascular: {
			id: "cardiovascular",
			name: "Cardiovascular",
			shortName: "Cardiovascular",
			metrics: ["heartRate", "bloodPressure"],
			whyItMatters: "Heart and blood vessels adapt to weightlessness, which affects how the body responds to exertion and to returning to gravity.",
			inSpace: [
				"Microgravity redistributes body fluids toward the upper body.",
				"Cardiovascular adaptation and deconditioning may change heart-rate and blood-pressure responses.",
				"Reconditioning and hydration plans are mission-specific."
			],
			relevantMeasurements: [
				"Resting heart rate",
				"Blood pressure",
				"Orthostatic or exercise-response measures, only if the mission protocol supports them"
			],
			selfCheckSteps: [
				"Secure the measurement device and follow its instructions.",
				"Use the same posture and measurement conditions where possible.",
				"Rest for the protocol-defined period.",
				"Position the cuff as instructed and take the reading.",
				"Repeat if the device reports an error or the result is unexpected.",
				"Record posture, time, symptoms and the measurement."
			],
			deviceRequired: "Automated blood-pressure cuff; heart-rate monitor.",
			caveat: "Readings outside the configured range need repeating and protocol review; they are not a diagnosis.",
			trendTab: "heartRate",
			nominalNextStep: "Keep the daily resting measurement at the same time and posture."
		},
		musculoskeletal: {
			id: "musculoskeletal",
			name: "Musculoskeletal / Bone",
			shortName: "Musculoskeletal",
			metrics: ["aredMinutes"],
			whyItMatters: "Bone and muscle strength determine how safely crew can work, perform an emergency egress and readapt after landing.",
			inSpace: [
				"Reduced mechanical loading can contribute to bone and muscle loss.",
				"Resistive exercise is an important countermeasure.",
				"Exercise adherence and trends are useful context, but they do not directly measure bone density."
			],
			relevantMeasurements: [
				"ARED minutes and completed sessions",
				"Exercise adherence over the week",
				"Strength or bone-health measures only when supported by an approved device and protocol"
			],
			selfCheckSteps: [
				"Review the scheduled exercise plan.",
				"Inspect equipment readiness.",
				"Complete only the assigned session.",
				"Record completed minutes and any equipment or discomfort issue.",
				"Do not increase intensity or duration based on app suggestions alone."
			],
			deviceRequired: "ARED or the mission's approved resistive exercise device.",
			caveat: "Exercise minutes describe adherence, not bone density or muscle mass.",
			trendTab: "ared",
			nominalNextStep: "Complete today's assigned resistive session and log the minutes."
		},
		immuneRadiation: {
			id: "immuneRadiation",
			name: "Immune & Radiation",
			shortName: "Immune & radiation",
			metrics: ["radiation"],
			whyItMatters: "Radiation exposure and spaceflight stressors are relevant to immune function and long-term health.",
			inSpace: [
				"Spaceflight stressors and radiation exposure are relevant to immune function.",
				"Solar particle events may require mission-specific radiation protection actions.",
				"A space-weather event is not the same thing as a measured personal radiation dose."
			],
			relevantMeasurements: [
				"Cumulative dosimeter dose",
				"Daily dose change from the dosimeter",
				"NASA DONKI solar flares, SEP events, CMEs and notifications (environmental context)",
				"Symptoms or immune measurements only from an approved instrument or protocol"
			],
			selfCheckSteps: [
				"Review the current dosimeter reading and timestamp.",
				"Confirm that the measurement is current and from the expected device.",
				"Review the mission space-weather alert.",
				"Follow the approved radiation protection and shelter procedure when directed.",
				"Record the event and any required crew actions."
			],
			deviceRequired: "Personal dosimeter; mission space-weather alert feed.",
			caveat: "ASTRA-MED never converts a flare class or DONKI event into a personal dose. Forecast hazard and measured exposure are shown separately.",
			trendTab: "radiation",
			nominalNextStep: "Review the dosimeter reading and the space-weather monitor once per day."
		},
		metabolicCircadian: {
			id: "metabolicCircadian",
			name: "Metabolic & Circadian",
			shortName: "Metabolic & circadian",
			metrics: [
				"bloodGlucose",
				"bodyTemperature",
				"mood",
				"hydration",
				"sleep"
			],
			whyItMatters: "Energy, temperature regulation, mood and daily rhythm affect performance and recovery across the whole mission.",
			inSpace: [
				"Altered light-dark cues and mission schedules can disrupt circadian timing.",
				"Sleep, nutrition, hydration and workload can influence metabolic indicators.",
				"Glucose values require context such as timing and the mission's measurement protocol."
			],
			relevantMeasurements: [
				"Blood glucose",
				"Sleep duration",
				"Mood",
				"Hydration",
				"Temperature"
			],
			selfCheckSteps: [
				"Confirm the correct measurement device and supplies.",
				"Follow the device instructions and mission timing protocol.",
				"Record whether the reading was fasting, post-meal or otherwise contextualized if relevant.",
				"Record sleep and mood using the same scale each day.",
				"Follow the approved protocol for unusual results."
			],
			deviceRequired: "Glucometer and strips; thermometer; fluid log.",
			caveat: "Single readings need timing context. Look at the trend before drawing conclusions.",
			trendTab: "bloodGlucose",
			nominalNextStep: "Keep the daily check-in, hydration log and scheduled glucose checks."
		}
	};
	// src/data/countermeasureTasks.ts
	function getCountermeasureTasks(aredTargetMinutes, hydrationTargetLiters) {
		return [
			{
				id: "health-check-in",
				systems: ["cardiovascular", "metabolicCircadian"],
				title: "Daily health check-in",
				description: "Review today's required vitals and log anything missing.",
				category: "monitoring",
				targetLabel: "Heart rate, blood pressure, temperature reviewed",
				xp: 20,
				guidance: {
					kind: "system",
					id: "cardiovascular"
				},
				missedPrompt: "Yesterday's vitals review was not marked complete. Review today's readings first.",
				timing: "morning"
			},
			{
				id: "sleep-log",
				systems: ["neuroOcular", "metabolicCircadian"],
				title: "Sleep log",
				description: "Record the length of your last sleep period.",
				category: "sleep",
				targetLabel: "One entry per sleep period",
				xp: 10,
				linkedMetric: "sleep",
				guidance: {
					kind: "metric",
					id: "sleep"
				},
				missedPrompt: "No sleep entry was confirmed yesterday. Log today's sleep using the same method each day.",
				timing: "morning"
			},
			{
				id: "ared-session",
				systems: ["musculoskeletal", "cardiovascular"],
				title: "Strength exercise (ARED)",
				description: "Complete only the assigned session in today's exercise plan.",
				category: "exercise",
				targetLabel: `Demo target ${aredTargetMinutes} min (mission plan configurable)`,
				xp: 40,
				linkedMetric: "aredMinutes",
				guidance: {
					kind: "metric",
					id: "aredMinutes"
				},
				missedPrompt: "Yesterday's resistive session was below plan. Complete today's assigned session only; do not add time or load to make up for it.",
				timing: "day"
			},
			{
				id: "pvt-check",
				systems: ["neuroOcular"],
				title: "PVT cognitive reaction check",
				description: "Run the scheduled Psychomotor Vigilance Test without interruptions.",
				category: "cognitive",
				targetLabel: "Scheduled session completed",
				xp: 15,
				linkedMetric: "pvt",
				guidance: {
					kind: "metric",
					id: "pvt"
				},
				everyNDays: 3,
				missedPrompt: "Yesterday's PVT check was not completed. Run it at a quiet moment today.",
				timing: "day"
			},
			{
				id: "hydration-check",
				systems: ["metabolicCircadian", "cardiovascular"],
				title: "Hydration check",
				description: "Record today's fluid intake against the mission plan.",
				category: "hydration",
				targetLabel: `Demo plan ${hydrationTargetLiters.toFixed(1)} L`,
				xp: 10,
				linkedMetric: "hydration",
				guidance: {
					kind: "metric",
					id: "hydration"
				},
				missedPrompt: "Yesterday's fluid intake was not confirmed. Check today's intake against the plan.",
				timing: "day"
			},
			{
				id: "radiation-review",
				systems: ["immuneRadiation"],
				title: "Radiation status review",
				description: "Review the dosimeter reading and the space-weather monitor.",
				category: "radiation",
				targetLabel: "Dosimeter and alerts reviewed",
				xp: 10,
				guidance: {
					kind: "system",
					id: "immuneRadiation"
				},
				missedPrompt: "Yesterday's radiation review was not completed. Check the dosimeter and space-weather monitor.",
				timing: "day"
			},
			{
				id: "wind-down",
				systems: ["neuroOcular", "metabolicCircadian"],
				title: "Evening blue-light wind-down",
				description: "Follow the scheduled pre-sleep lighting and screen routine.",
				category: "sleep",
				targetLabel: "Routine started at the scheduled time",
				xp: 10,
				guidance: {
					kind: "metric",
					id: "sleep"
				},
				missedPrompt: "Yesterday's wind-down routine was skipped. Start it at the scheduled time tonight.",
				timing: "evening"
			}
		];
	}
	var donki_fallback_default = {
		provenance: {
			"source": "NASA CCMC DONKI web service",
			"endpoint": "https://ccmc.gsfc.nasa.gov/DONKI/WS/get",
			"window": {
				"start": "2024-05-08",
				"end": "2024-05-16"
			},
			"retrievedAt": "2026-11-14T04:35:41.342Z",
			"note": "Archived real DONKI records, trimmed for size. Bundled as offline demonstration fallback; never live data."
		},
		FLR: [
			{
				"flrID": "2024-05-08T01:33:00-FLR-001",
				"beginTime": "2024-05-08T01:33Z",
				"peakTime": "2024-05-08T01:41Z",
				"endTime": "2024-05-08T01:48Z",
				"classType": "X1.0",
				"sourceLocation": "N25W60",
				"activeRegionNum": 13663,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30548/-1",
				"linkedEvents": null,
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-08T04:37:00-FLR-001",
				"beginTime": "2024-05-08T04:37Z",
				"peakTime": "2024-05-08T05:09Z",
				"endTime": "2024-05-08T05:32Z",
				"classType": "X1.0",
				"sourceLocation": "S22W10",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30551/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T05:36:00-CME-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-08T06:44:00-FLR-001",
				"beginTime": "2024-05-08T06:44Z",
				"peakTime": "2024-05-08T06:53Z",
				"endTime": "2024-05-08T07:03Z",
				"classType": "M7.1",
				"sourceLocation": "S21W18",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30553/-1",
				"linkedEvents": null,
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-08T11:26:00-FLR-001",
				"beginTime": "2024-05-08T11:26Z",
				"peakTime": "2024-05-08T12:04Z",
				"endTime": "2024-05-08T12:17Z",
				"classType": "M8.6",
				"sourceLocation": "S20W11",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30555/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T12:24:00-CME-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-08T17:32:00-FLR-001",
				"beginTime": "2024-05-08T17:32Z",
				"peakTime": "2024-05-08T17:53Z",
				"endTime": "2024-05-08T18:00Z",
				"classType": "M7.9",
				"sourceLocation": "S17W13",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30586/-1",
				"linkedEvents": null,
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-08T21:08:00-FLR-001",
				"beginTime": "2024-05-08T21:08Z",
				"peakTime": "2024-05-08T21:40Z",
				"endTime": "2024-05-08T23:10Z",
				"classType": "X1.0",
				"sourceLocation": "S20W17",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30601/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T22:24:00-CME-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-08T22:05:00-FLR-001",
				"beginTime": "2024-05-08T22:05Z",
				"peakTime": "2024-05-08T22:27Z",
				"endTime": "2024-05-08T23:12Z",
				"classType": "M9.8",
				"sourceLocation": "S22W22",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30603/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T22:24:00-CME-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-09T08:45:00-FLR-001",
				"beginTime": "2024-05-09T08:45Z",
				"peakTime": "2024-05-09T09:13Z",
				"endTime": "2024-05-09T09:36Z",
				"classType": "X2.2",
				"sourceLocation": "S20W25",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30605/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-09T09:24:00-CME-001" },
					{ "activityID": "2024-05-09T13:59:00-SEP-001" },
					{ "activityID": "2024-05-09T14:25:00-SEP-001" },
					{ "activityID": "2024-05-10T12:59:00-SEP-001" },
					{ "activityID": "2024-05-10T13:02:00-SEP-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-09T17:23:00-FLR-001",
				"beginTime": "2024-05-09T17:23Z",
				"peakTime": "2024-05-09T17:44Z",
				"endTime": "2024-05-09T18:00Z",
				"classType": "X1.1",
				"sourceLocation": "S18W29",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30634/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-09T18:23:00-CME-001" },
					{ "activityID": "2024-05-10T12:59:00-SEP-001" },
					{ "activityID": "2024-05-10T13:02:00-SEP-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-10T06:27:00-FLR-001",
				"beginTime": "2024-05-10T06:27Z",
				"peakTime": "2024-05-10T06:54Z",
				"endTime": "2024-05-10T07:06Z",
				"classType": "X3.9",
				"sourceLocation": "S18W37",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30666/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-10T07:12:00-CME-001" },
					{ "activityID": "2024-05-10T12:59:00-SEP-001" },
					{ "activityID": "2024-05-10T13:02:00-SEP-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-10T13:58:00-FLR-001",
				"beginTime": "2024-05-10T13:58Z",
				"peakTime": "2024-05-10T14:11Z",
				"endTime": "2024-05-10T14:23Z",
				"classType": "M5.9",
				"sourceLocation": "S16W40",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30680/-1",
				"linkedEvents": [{ "activityID": "2024-05-10T14:50:00-SEP-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-11T01:10:00-FLR-001",
				"beginTime": "2024-05-11T01:10Z",
				"peakTime": "2024-05-11T01:23Z",
				"endTime": "2024-05-11T01:39Z",
				"classType": "X5.8",
				"sourceLocation": "S17W47",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-11T01:36:00-CME-001" },
					{ "activityID": "2024-05-11T02:10:00-SEP-001" },
					{ "activityID": "2024-05-11T04:07:00-SEP-001" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-11T11:15:00-FLR-001",
				"beginTime": "2024-05-11T11:15Z",
				"peakTime": "2024-05-11T11:44Z",
				"endTime": "2024-05-11T12:05Z",
				"classType": "X1.5",
				"sourceLocation": "S19W60",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30722/-1",
				"linkedEvents": null,
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-11T14:46:00-FLR-001",
				"beginTime": "2024-05-11T14:46Z",
				"peakTime": "2024-05-11T15:25Z",
				"endTime": "2024-05-11T15:52Z",
				"classType": "M8.8",
				"sourceLocation": "S17W53",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30729/-1",
				"linkedEvents": [{ "activityID": "2024-05-11T16:24:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-12T16:11:00-FLR-001",
				"beginTime": "2024-05-12T16:11Z",
				"peakTime": "2024-05-12T16:26Z",
				"endTime": "2024-05-12T16:38Z",
				"classType": "X1.0",
				"sourceLocation": "S21W75",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30760/-1",
				"linkedEvents": null,
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-13T09:36:00-FLR-001",
				"beginTime": "2024-05-13T09:36Z",
				"peakTime": "2024-05-13T09:44Z",
				"endTime": "2024-05-13T10:57Z",
				"classType": "M6.6",
				"sourceLocation": "S22W80",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30803/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T12:44:00-SEP-001" },
					{ "activityID": "2024-05-13T13:10:00-SEP-001" },
					{ "activityID": "2024-05-13T14:00:00-SEP-001" },
					{ "activityID": "2024-05-13T16:19:00-SEP-001" },
					{ "activityID": "2024-05-13T18:07:00-SEP-001" },
					{ "activityID": "2024-05-13T18:07:00-SEP-002" }
				],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-14T02:03:00-FLR-001",
				"beginTime": "2024-05-14T02:03Z",
				"peakTime": "2024-05-14T02:09Z",
				"endTime": "2024-05-14T02:19Z",
				"classType": "X1.7",
				"sourceLocation": "S19W89",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30832/-1",
				"linkedEvents": [{ "activityID": "2024-05-14T02:24:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-14T04:05:00-FLR-001",
				"beginTime": "2024-05-14T04:05Z",
				"peakTime": "2024-05-14T04:08Z",
				"endTime": "2024-05-14T04:16Z",
				"classType": "C6.5",
				"sourceLocation": "S09E60",
				"activeRegionNum": 13679,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30839/-1",
				"linkedEvents": [{ "activityID": "2024-05-14T04:48:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-14T12:40:00-FLR-001",
				"beginTime": "2024-05-14T12:40Z",
				"peakTime": "2024-05-14T12:55Z",
				"endTime": "2024-05-14T13:05Z",
				"classType": "X1.2",
				"sourceLocation": "S19W90",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30837/-1",
				"linkedEvents": [{ "activityID": "2024-05-14T13:12:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-14T16:46:00-FLR-001",
				"beginTime": "2024-05-14T16:46Z",
				"peakTime": "2024-05-14T16:51Z",
				"endTime": "2024-05-14T17:02Z",
				"classType": "X8.7",
				"sourceLocation": "S19W90",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30849/-1",
				"linkedEvents": [{ "activityID": "2024-05-14T17:00:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-15T08:18:00-FLR-001",
				"beginTime": "2024-05-15T08:18Z",
				"peakTime": "2024-05-15T08:37Z",
				"endTime": "2024-05-15T08:52Z",
				"classType": "X3.4",
				"sourceLocation": "S20W90",
				"activeRegionNum": 13664,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30879/-1",
				"linkedEvents": [{ "activityID": "2024-05-15T08:48:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			},
			{
				"flrID": "2024-05-15T14:20:00-FLR-001",
				"beginTime": "2024-05-15T14:20Z",
				"peakTime": "2024-05-15T14:38Z",
				"endTime": "2024-05-15T14:51Z",
				"classType": "X2.9",
				"sourceLocation": "S12E90",
				"activeRegionNum": 13685,
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30900/-1",
				"linkedEvents": [{ "activityID": "2024-05-15T14:53:00-CME-001" }],
				"instruments": [{ "displayName": "GOES-P: EXIS 1.0-8.0" }]
			}
		],
		SEP: [
			{
				"sepID": "2024-05-09T13:59:00-SEP-001",
				"eventTime": "2024-05-09T13:59Z",
				"instruments": [{ "displayName": "MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV" }],
				"linkedEvents": [{ "activityID": "2024-05-09T08:45:00-FLR-001" }],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1"
			},
			{
				"sepID": "2024-05-09T14:25:00-SEP-001",
				"eventTime": "2024-05-09T14:25Z",
				"instruments": [{ "displayName": "MODEL: REleASE:SOHO/EPHIN 15.8-39.8 MeV" }],
				"linkedEvents": [{ "activityID": "2024-05-09T08:45:00-FLR-001" }],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30610/-1"
			},
			{
				"sepID": "2024-05-10T12:59:00-SEP-001",
				"eventTime": "2024-05-10T12:59Z",
				"instruments": [{ "displayName": "SOHO: COSTEP 15.8-39.8 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-09T08:45:00-FLR-001" },
					{ "activityID": "2024-05-09T17:23:00-FLR-001" },
					{ "activityID": "2024-05-10T06:27:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30675/-1"
			},
			{
				"sepID": "2024-05-10T13:02:00-SEP-001",
				"eventTime": "2024-05-10T13:02Z",
				"instruments": [{ "displayName": "SOHO: COSTEP 28.2-50.1 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-09T08:45:00-FLR-001" },
					{ "activityID": "2024-05-09T17:23:00-FLR-001" },
					{ "activityID": "2024-05-10T06:27:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30676/-1"
			},
			{
				"sepID": "2024-05-10T13:35:00-SEP-001",
				"eventTime": "2024-05-10T13:35Z",
				"instruments": [{ "displayName": "GOES-P: SEISS >10 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-08T04:20:00-FLR-001" },
					{ "activityID": "2024-05-08T04:37:00-FLR-001" },
					{ "activityID": "2024-05-08T05:36:00-CME-001" },
					{ "activityID": "2024-05-08T11:26:00-FLR-001" },
					{ "activityID": "2024-05-08T12:24:00-CME-001" },
					{ "activityID": "2024-05-08T21:08:00-FLR-001" },
					{ "activityID": "2024-05-08T22:05:00-FLR-001" },
					{ "activityID": "2024-05-08T22:24:00-CME-001" },
					{ "activityID": "2024-05-09T08:45:00-FLR-001" },
					{ "activityID": "2024-05-09T09:24:00-CME-001" },
					{ "activityID": "2024-05-09T17:23:00-FLR-001" },
					{ "activityID": "2024-05-09T18:23:00-CME-001" },
					{ "activityID": "2024-05-10T06:27:00-FLR-001" },
					{ "activityID": "2024-05-10T07:12:00-CME-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30677/-1"
			},
			{
				"sepID": "2024-05-10T14:50:00-SEP-001",
				"eventTime": "2024-05-10T14:50Z",
				"instruments": [{ "displayName": "STEREO A: IMPACT 13-100 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-08T04:20:00-FLR-001" },
					{ "activityID": "2024-05-08T04:37:00-FLR-001" },
					{ "activityID": "2024-05-08T11:26:00-FLR-001" },
					{ "activityID": "2024-05-08T12:24:00-CME-001" },
					{ "activityID": "2024-05-08T21:08:00-FLR-001" },
					{ "activityID": "2024-05-08T22:05:00-FLR-001" },
					{ "activityID": "2024-05-08T22:24:00-CME-001" },
					{ "activityID": "2024-05-09T08:45:00-FLR-001" },
					{ "activityID": "2024-05-09T09:24:00-CME-001" },
					{ "activityID": "2024-05-09T17:23:00-FLR-001" },
					{ "activityID": "2024-05-09T18:23:00-CME-001" },
					{ "activityID": "2024-05-10T06:27:00-FLR-001" },
					{ "activityID": "2024-05-10T07:12:00-CME-001" },
					{ "activityID": "2024-05-10T13:58:00-FLR-001" },
					{ "activityID": "2024-05-10T14:00:00-IPS-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30684/-1"
			},
			{
				"sepID": "2024-05-11T02:10:00-SEP-001",
				"eventTime": "2024-05-11T02:10Z",
				"instruments": [{ "displayName": "GOES-P: SEISS >100 MeV" }],
				"linkedEvents": [{ "activityID": "2024-05-11T01:10:00-FLR-001" }, { "activityID": "2024-05-11T01:36:00-CME-001" }],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1"
			},
			{
				"sepID": "2024-05-11T04:07:00-SEP-001",
				"eventTime": "2024-05-11T04:07Z",
				"instruments": [{ "displayName": "STEREO A: IMPACT 13-100 MeV" }],
				"linkedEvents": [{ "activityID": "2024-05-11T01:10:00-FLR-001" }, { "activityID": "2024-05-11T01:36:00-CME-001" }],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30717/-1"
			},
			{
				"sepID": "2024-05-13T12:44:00-SEP-001",
				"eventTime": "2024-05-13T12:44Z",
				"instruments": [{ "displayName": "STEREO A: IMPACT 13-100 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30811/-1"
			},
			{
				"sepID": "2024-05-13T13:10:00-SEP-001",
				"eventTime": "2024-05-13T13:10Z",
				"instruments": [{ "displayName": "MODEL: REleASE:SOHO/EPHIN 15.8-39.8 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30807/-1"
			},
			{
				"sepID": "2024-05-13T14:00:00-SEP-001",
				"eventTime": "2024-05-13T14:00Z",
				"instruments": [{ "displayName": "GOES-P: SEISS >10 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30817/-1"
			},
			{
				"sepID": "2024-05-13T16:19:00-SEP-001",
				"eventTime": "2024-05-13T16:19Z",
				"instruments": [{ "displayName": "MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30820/-1"
			},
			{
				"sepID": "2024-05-13T18:07:00-SEP-001",
				"eventTime": "2024-05-13T18:07Z",
				"instruments": [{ "displayName": "SOHO: COSTEP 15.8-39.8 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30824/-1"
			},
			{
				"sepID": "2024-05-13T18:07:00-SEP-002",
				"eventTime": "2024-05-13T18:07Z",
				"instruments": [{ "displayName": "SOHO: COSTEP 28.2-50.1 MeV" }],
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:12:00-CME-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" }
				],
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30825/-1"
			}
		],
		CME: [
			{
				"activityID": "2024-05-08T05:36:00-CME-001",
				"startTime": "2024-05-08T05:36Z",
				"sourceLocation": "S22W10",
				"activeRegionNum": 13664,
				"note": "Earth-directed full halo seen in all coronagraphs. The source is a large eruption from AR 3664, which included two flares seen in SDO AIA 131, an initial M3.5 (S21W10) followed by the main long-duration X1.0 (S22W10) which peaked at 2024-05-08T04:30Z and 2024-05-08T05:09Z respectively. An EUV wave and field line movement is observed in SDO AIA 94/131/171/211 with some surface brightening in SDO AIA 304. This flare+CME combo resulted in a small rise in protons observed at SOHO and GOES, but not e",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30589/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T04:20:00-FLR-001" },
					{ "activityID": "2024-05-08T04:37:00-FLR-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:00:00-IPS-001" },
					{ "activityID": "2024-05-10T15:00:00-GST-001" },
					{ "activityID": "2024-05-10T16:36:00-IPS-001" },
					{ "activityID": "2024-05-10T18:01:00-MPC-001" },
					{ "activityID": "2024-05-15T13:55:00-RBE-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 870,
					"type": "C",
					"halfAngle": 43,
					"latitude": -7,
					"longitude": 9
				}]
			},
			{
				"activityID": "2024-05-08T12:24:00-CME-001",
				"startTime": "2024-05-08T12:24Z",
				"sourceLocation": "S20W11",
				"activeRegionNum": 13664,
				"note": "Earth-directed full halo seen in all coronagraphs. The source is a large eruption from AR 3664, which included a long-duration M8.6 flare (S22W11) which peaked at 2024-05-08T12:04Z best seen in SDO AIA 131. An EUV wave and field line movement is observed in SDO AIA 94/131/171/211 with some surface brightening in SDO AIA 304. This flare+CME combo resulted in a small rise in protons observed at SOHO and GOES, but not enough for a threshold crossing. The start time used here is when the shock front",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30564/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T11:26:00-FLR-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:00:00-IPS-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" },
					{ "activityID": "2024-05-10T15:00:00-GST-001" },
					{ "activityID": "2024-05-10T16:36:00-IPS-001" },
					{ "activityID": "2024-05-10T18:01:00-MPC-001" },
					{ "activityID": "2024-05-15T13:55:00-RBE-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 776,
					"type": "C",
					"halfAngle": 45,
					"latitude": -5,
					"longitude": 3
				}]
			},
			{
				"activityID": "2024-05-08T19:12:00-CME-001",
				"startTime": "2024-05-08T19:12Z",
				"sourceLocation": "N10E20",
				"activeRegionNum": 13667,
				"note": "This CME is visible to the northeast in SOHO LASCO C2/C3 and in STEREO A COR2 for a few frames prior to and following a data gap lasting from 2024-05-08T19:53Z to 2024-05-09T01:53Z. The source is a filament eruption near Active Region 13667 (N26E22) starting around 2024-05-08T18:07Z as seen in SDO AIA 131, 171, 193, 304 imagery. Filament material can be seen against the backdrop of the East limb as the material continues to leave the field of view in SDO AIA 304 around 19:35Z. A large dimming ar",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30612/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-10T14:00:00-IPS-001" },
					{ "activityID": "2024-05-10T15:00:00-GST-001" },
					{ "activityID": "2024-05-10T16:36:00-IPS-001" },
					{ "activityID": "2024-05-10T18:01:00-MPC-001" },
					{ "activityID": "2024-05-15T13:55:00-RBE-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 828,
					"type": "C",
					"halfAngle": 38,
					"latitude": 3,
					"longitude": -23
				}]
			},
			{
				"activityID": "2024-05-08T22:24:00-CME-001",
				"startTime": "2024-05-08T22:24Z",
				"sourceLocation": "S20W17",
				"activeRegionNum": 13664,
				"note": "Full halo CME with a bulk portion visible to the southwest in SOHO LASCO C2/C3 and STEREO A COR2 imagery following a data gap in STEREO A COR2 lasting from 2024-05-08T19:53Z to 2024-05-09T01:53Z. The source is a large eruption and accompanying X1.0 and M9.8 flares from Active Region 13664 (S20W17) staring around 2024-05-08T21:08Z. Two rising loops are seen from Active Region 13664 (S20W17) staring around 2024-05-08T21:29Z and 22:08Z, respectively, as seen in SDO AIA 193/131, which likely resulte",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30640/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-08T21:08:00-FLR-001" },
					{ "activityID": "2024-05-08T22:05:00-FLR-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" },
					{ "activityID": "2024-05-10T15:00:00-GST-001" },
					{ "activityID": "2024-05-10T18:01:00-MPC-001" },
					{ "activityID": "2024-05-11T09:30:00-IPS-001" },
					{ "activityID": "2024-05-15T13:55:00-RBE-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1257,
					"type": "O",
					"halfAngle": 45,
					"latitude": -6,
					"longitude": 5
				}]
			},
			{
				"activityID": "2024-05-09T09:24:00-CME-001",
				"startTime": "2024-05-09T09:24Z",
				"sourceLocation": "S20W25",
				"activeRegionNum": 13664,
				"note": "Halo CME visible in SOHO LASCO C2, C3, and STEREO A COR2 imagery. This halo is associated with the X2.2 class flare from AR13664 peaking at 2024-05-09T09:13Z. A clear EUV wave is visible in SDO/AIA 193 and 211 crossing towards the central meridian and towards the limb in the southwest. Post-eruptive arcades are present in SDO/AIA 193 and 131. Brightening is visible in SDO/AIA 304.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30619/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-09T08:45:00-FLR-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" },
					{ "activityID": "2024-05-10T15:00:00-GST-001" },
					{ "activityID": "2024-05-10T18:01:00-MPC-001" },
					{ "activityID": "2024-05-11T09:30:00-IPS-001" },
					{ "activityID": "2024-05-15T13:55:00-RBE-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1330,
					"type": "O",
					"halfAngle": 45,
					"latitude": -6,
					"longitude": 19
				}]
			},
			{
				"activityID": "2024-05-09T18:23:00-CME-001",
				"startTime": "2024-05-09T18:23Z",
				"sourceLocation": "S18W29",
				"activeRegionNum": 13664,
				"note": "Partial halo CME associated with an X1.1 flare from AR 3664 (S18W29) with a full halo faint shock and slightly brighter fuzzy-fronted bulk. The start time is possibly earlier that 18:23Z  as the start of this event is covered by a data gap in SOHO due to a maneuver. Coronal signatures include a large ejecta from AR 3664 seen starting north-westwards ~17:36ZZ in AIA 304, a significant-area dimming mostly extending northward and westward of the flare location and stretching as far as the two coron",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30655/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-09T17:23:00-FLR-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" },
					{ "activityID": "2024-05-11T20:30:00-IPS-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 895,
					"type": "C",
					"halfAngle": 44,
					"latitude": -6,
					"longitude": 30
				}]
			},
			{
				"activityID": "2024-05-10T07:12:00-CME-001",
				"startTime": "2024-05-10T07:12Z",
				"sourceLocation": "S18W37",
				"activeRegionNum": 13664,
				"note": "This CME is visible as an asymmetrical halo directed primarily towards the west in SOHO LASCO C2/C3 and STEREO A COR2 imagery. The source is an eruption and X3.9 flare from Active Region 13664 (S18W37) starting around 2024-05-10T06:45Z as seen in SDO AIA 131, 171, 193, 304 imagery. An EUV wave is seen in SDO AIA 193 imagery extending to north of the flare to N20W40 and east to S25E20. Post eruptive arcades begin to form around 2024-05-10T08:00Z as seen in SDO AIA 171 and 193 imagery.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30670/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-10T06:27:00-FLR-001" },
					{ "activityID": "2024-05-10T13:35:00-SEP-001" },
					{ "activityID": "2024-05-10T14:50:00-SEP-001" },
					{ "activityID": "2024-05-12T08:55:00-IPS-001" },
					{ "activityID": "2024-05-12T21:00:00-GST-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1018,
					"type": "O",
					"halfAngle": 41,
					"latitude": -2,
					"longitude": 31
				}]
			},
			{
				"activityID": "2024-05-10T21:28:00-CME-001",
				"startTime": "2024-05-10T21:28Z",
				"sourceLocation": "S35E01",
				"activeRegionNum": null,
				"note": "A narrow faint CME to the south with an uncertain source. It might be associated with some eruptive activities occurring along a very long filament centered loosely around S35E01 to the east of AR 3664 which finally erupts after 21Z: the area close to filament center shows eruptive  activity/dimming/restructuring around 16Z, 18Z and after 20Z.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30753/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 717,
					"type": "C",
					"halfAngle": 18,
					"latitude": -42,
					"longitude": 2
				}]
			},
			{
				"activityID": "2024-05-11T01:36:00-CME-001",
				"startTime": "2024-05-11T01:36Z",
				"sourceLocation": "S17W47",
				"activeRegionNum": 13664,
				"note": "Ear-shaped bright partial halo CME with a very complex shape brighter bulk and a fainter somewhat asymmetric full halo shock. The CME is associated with the X5.8 flare and a significant eruption (massive dimming) and EUV wave seen in SDO 193.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30719/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-11T01:10:00-FLR-001" },
					{ "activityID": "2024-05-11T02:10:00-SEP-001" },
					{ "activityID": "2024-05-11T04:07:00-SEP-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1263,
					"type": "O",
					"halfAngle": 51,
					"latitude": 0,
					"longitude": 51
				}]
			},
			{
				"activityID": "2024-05-11T03:12:00-CME-002",
				"startTime": "2024-05-11T03:12Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "Faint front to the West following the 2024-05-11T01:36Z CME. The source was not found on the disk.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30793/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1032,
					"type": "O",
					"halfAngle": 38,
					"latitude": 5,
					"longitude": 50
				}]
			},
			{
				"activityID": "2024-05-11T16:24:00-CME-001",
				"startTime": "2024-05-11T16:24Z",
				"sourceLocation": "S17W53",
				"activeRegionNum": 13664,
				"note": "Narrow CME seen to the west in SOHO LASCO C2, C3, and STEREO A COR2 imagery following M8.8 class flare from AR13664. The source is clearly visible in SDO/AIA wavelengths (193/171/304/211/94/131/335) and in STEREO A EUVI 195. There is clear dimming towards the coronal hole to the north of the active region as well as a minor EUV wave towards the north.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30742/-1",
				"linkedEvents": [{ "activityID": "2024-05-11T14:46:00-FLR-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 946,
					"type": "C",
					"halfAngle": 25,
					"latitude": -2,
					"longitude": 53
				}]
			},
			{
				"activityID": "2024-05-13T09:12:00-CME-001",
				"startTime": "2024-05-13T09:12Z",
				"sourceLocation": "S25W75",
				"activeRegionNum": 13664,
				"note": "Full asymmetric halo CME seen to the SW in all three coronagraphs. Source is a large eruption and several M-class flares from Active Region 13664, including a long-duration M4.9 flare associated with the post-eruptive arcades. Widely opening field lines and a rising loop of ejecta seen starting at 2024-05-13T08:10Z in SDO AIA 193/171. Ejecta and post-eruptive brightening and arcades seen at 08:43Z in SDO AIA 131/304. Post eruptive arcades seen at 11:15Z in SDO AIA 171/193/304.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30814/-1",
				"linkedEvents": [
					{ "activityID": "2024-05-13T08:06:00-FLR-001" },
					{ "activityID": "2024-05-13T08:23:00-FLR-001" },
					{ "activityID": "2024-05-13T08:47:00-FLR-001" },
					{ "activityID": "2024-05-13T09:36:00-FLR-001" },
					{ "activityID": "2024-05-13T12:44:00-SEP-001" },
					{ "activityID": "2024-05-13T13:10:00-SEP-001" },
					{ "activityID": "2024-05-13T14:00:00-SEP-001" },
					{ "activityID": "2024-05-13T16:19:00-SEP-001" },
					{ "activityID": "2024-05-13T18:07:00-SEP-001" },
					{ "activityID": "2024-05-13T18:07:00-SEP-002" },
					{ "activityID": "2024-05-15T18:13:00-IPS-001" }
				],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1456,
					"type": "O",
					"halfAngle": 49,
					"latitude": -36,
					"longitude": 72
				}]
			},
			{
				"activityID": "2024-05-14T10:09:00-CME-001",
				"startTime": "2024-05-14T10:09Z",
				"sourceLocation": "N25E35",
				"activeRegionNum": null,
				"note": "Wide CME seen to the NE in all coronagraphs (STEREO A gets first visible frame). Source is an unnumbered region of the solar disk, centered around N23E35. Starting around 2024-05-14T09:07Z, field line movement is observed in SDO AIA 171/193/211 alongside a diagonal region of light dimming spanning approximately N40E60 -> N15E30 across that center point. A distinct post-eruptive arcade forms around 2024-05-14T10:47Z across SDO AIA 131/171/193/211.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30856/-1",
				"linkedEvents": [{ "activityID": "2024-05-17T11:48:00-IPS-001" }, { "activityID": "2024-05-17T12:40:00-IPS-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 744,
					"type": "C",
					"halfAngle": 34,
					"latitude": 41,
					"longitude": -34
				}]
			},
			{
				"activityID": "2024-05-14T10:36:00-CME-001",
				"startTime": "2024-05-14T10:36Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "This irregularly shaped CME is seen to the SW in SOHO LASCO C2/C3 and STEREO A COR2. Source is likely near Active Region 13664 which was at about W90-95 at the time of this eruption. Source is one of several instances of opening field lines seen on the SW limb at about S20 starting at 2024-05 14T08:30Z and lasting through 2024-05-14T10:30Z. The most likely occurrence of field line movement to be associated with this CME is seen in GOES SUVI 304 at 09:12Z. Field line movement is also seen in SDO ",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30915/-1",
				"linkedEvents": [{ "activityID": "2024-05-17T18:00:00-GST-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 763,
					"type": "C",
					"halfAngle": 23,
					"latitude": -29,
					"longitude": 92
				}]
			},
			{
				"activityID": "2024-05-14T17:00:00-CME-001",
				"startTime": "2024-05-14T17:00Z",
				"sourceLocation": "S19W96",
				"activeRegionNum": 13664,
				"note": "Bright CME from behind the west limb, the first in a series of two closely following CMEs. Its source is the occulted X8.7 flare from AR 3664, just over the limb. Coronal signatures include a massive EUV wave and field line movement/restructuring of magnetic field behind the limb across wide range of latitudes (mass seen departing) beginning ~2024-05-14T16:49Z, field line movement seen across every wavelength. Very fast opening of the field lines likely associated with this CME is best seen in A",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30867/-1",
				"linkedEvents": [{ "activityID": "2024-05-14T16:46:00-FLR-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 2119,
					"type": "R",
					"halfAngle": 37,
					"latitude": 3,
					"longitude": 96
				}]
			},
			{
				"activityID": "2024-05-14T17:30:00-CME-001",
				"startTime": "2024-05-14T17:30Z",
				"sourceLocation": "S19W96",
				"activeRegionNum": 13664,
				"note": "CME to the west which closely follows the preceding faster and slightly narrower 2024-05-14T17:0Z CME. The source of this second CME could be the long filament eruption off/behind the west limb best seen in GOES SUVI 304 starting at 2024-05-14T17:02Z.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30873/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1199,
					"type": "O",
					"halfAngle": 38,
					"latitude": 2,
					"longitude": 96
				}]
			},
			{
				"activityID": "2024-05-14T17:48:00-CME-001",
				"startTime": "2024-05-14T17:48Z",
				"sourceLocation": "N18E72",
				"activeRegionNum": 13682,
				"note": "Very wide eruption to the NE in all coronagraphs, notably bright with a twisted flux-rope structure beautifully observed in SOHO LASCO C2. The source is an eruption from new AR 3682, associated with an M4.4 class flare observed in SDO AIA 131. Also observed as field line movement and EUV wave in SDO AIA 171/193/211 starting around 2024-05-14T17:09Z, with a post-eruptive arcade forming shortly after. A massive loop is seen well in GOES SUVI 284 at 2024-05-14T17:33Z before it erupts further, not s",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30883/-1",
				"linkedEvents": [{ "activityID": "2024-05-14T17:25:00-FLR-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1292,
					"type": "O",
					"halfAngle": 43,
					"latitude": 16,
					"longitude": -72
				}]
			},
			{
				"activityID": "2024-05-15T08:36:00-CME-001",
				"startTime": "2024-05-15T08:36Z",
				"sourceLocation": "S15W90",
				"activeRegionNum": 13664,
				"note": "Bright CME seen due West in SOHO LASCO C2/C3 and STEREO A COR2. Source is EUV wave seen beyond the SW limb starting at 2024-05-15T08:18Z in SDO AIA 171/193. Widely opening field lines with northern deflection seen on or just beyond the SW limb at an apparent latitude of S15 (before deflection). This CME overlaps heavily with CME: 2024-05-15T08:48Z.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30891/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1766,
					"type": "O",
					"halfAngle": 31,
					"latitude": 2,
					"longitude": 105
				}]
			},
			{
				"activityID": "2024-05-15T08:48:00-CME-001",
				"startTime": "2024-05-15T08:48Z",
				"sourceLocation": "S20W100",
				"activeRegionNum": 13664,
				"note": "Fast CME seen to the WSW in all coronagraphs, overlaps with CME 2024-05-15T08:36Z. The source is an X3.4 flare (partially occulted) from AR 3664 that peaked at 2024-05-15T08:37Z, observed in SDO AIA 131/193/304, and located around the west limb at approximately W100-W105 at this time. Additionally observed source signature as large EUV wave in SDO AIA 171/193/211/304 starting around 2024-05-15T08:18Z.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30894/-1",
				"linkedEvents": [{ "activityID": "2024-05-15T08:18:00-FLR-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1082,
					"type": "O",
					"halfAngle": 24,
					"latitude": -29,
					"longitude": 114
				}]
			},
			{
				"activityID": "2024-05-15T10:00:00-CME-001",
				"startTime": "2024-05-15T10:00Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "This CME is a faint but distinct loop visible to the West in SOHO LASCO C2/C3 and STEREO A COR2. A distinct source for this CME is not discernable in UV imagery, so it is likely beyond the West limb. This CME is preceded by two much larger CMEs (2024-05-15T08:36Z and 2024-05-15T08:48Z) with source locations that are clearly beyond the limb and are measured to have similar speeds to this CME.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30913/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1205,
					"type": "O",
					"halfAngle": 37,
					"latitude": -6,
					"longitude": 113
				}]
			},
			{
				"activityID": "2024-05-15T10:36:00-CME-001",
				"startTime": "2024-05-15T10:36Z",
				"sourceLocation": "N35E35",
				"activeRegionNum": null,
				"note": "CME seen to the NNE in all coronagraphs. Observed in SDO AIA 171/193/211 as a loop centered over an unnumbered region on the disk ~N35E35. This loop slowly begins rising around 2024-05-16T06:30Z before explosively erupting and breaking around 2024-05-16T09:15Z. A broad area of dimming to the N and E of this area is observed in SDO AIA 193 with the eruption, a double ribbon flare is observed in SDO AIA 304 underneath this loop, and a post-eruptive arcade starts forming around 2024-05-16T10:09Z.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30940/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 805,
					"type": "C",
					"halfAngle": 31,
					"latitude": 46,
					"longitude": -13
				}]
			},
			{
				"activityID": "2024-05-15T10:48:00-CME-001",
				"startTime": "2024-05-15T10:48Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "This CME is seen to the W/SW in SOHO LASCO C2/C3 and STEREO A COR2. Source is a distinct loop of material (a flux rope) seen slowly rising from on or just beyond the SW limb, at an apparent latitude of S25, starting at 2024-05-15T10:00Z in SDO AIA 171/193 as well as in GOES SUVI 284/304/193. The longitude of candidate source location Active Region 13664 was at approximately W105. This CME is visible in only a few frames of STEREO A COR2 due to a short data gap lasting from 2024-05-15T12:23Z-13:3",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30920/-1",
				"linkedEvents": [{ "activityID": "2024-05-15T09:50:00-FLR-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1162,
					"type": "O",
					"halfAngle": 39,
					"latitude": -16,
					"longitude": 109
				}]
			},
			{
				"activityID": "2024-05-15T14:53:00-CME-001",
				"startTime": "2024-05-15T14:53Z",
				"sourceLocation": "",
				"activeRegionNum": 13685,
				"note": "Wide CME seen to the SE in all coronagraphs. A data gap in SOHO that will not backfill from 2024-05-15T13:36Z - 2024-05-15T16:05Z in C2 (T13:40Z-T16:30Z in C3) missed a large portion of the event, but it is still observed in later frames. Associated with an X2.9 flare from new AR 3685 which peaked at 2024-05-15T14:38Z in SDO AIA 131. Also observed as wide field line opening and EUV wave in SDO AIA 171/193/211 with a post-eruptive arcade across all wavelengths, both observed around 2024-05-15T14:",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30948/-1",
				"linkedEvents": [{ "activityID": "2024-05-15T14:20:00-FLR-001" }],
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1570,
					"type": "O",
					"halfAngle": 42,
					"latitude": -17,
					"longitude": -92
				}]
			},
			{
				"activityID": "2024-05-15T17:36:00-CME-001",
				"startTime": "2024-05-15T17:36Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "CME visible to the east in SOHO LASCO C2/C3 and STEREO A COR2. The source is not clearly visible in EUV imagery.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30968/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 732,
					"type": "C",
					"halfAngle": 23,
					"latitude": -9,
					"longitude": null
				}]
			},
			{
				"activityID": "2024-05-15T21:12:00-CME-001",
				"startTime": "2024-05-15T21:12Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "CME visible to the west in SOHO LASCO C2/C3. Not visible in STEREO A COR2 due to a data gap. The source can be seen as opening field lines starting at 2024-05-15T20:39Z best seen in SDO AIA 171/193 and GOES SUVI 284. A potential candidate active region is Active Region 13664, located around approximately W110.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30923/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1269,
					"type": "O",
					"halfAngle": 29,
					"latitude": 2,
					"longitude": 110
				}]
			},
			{
				"activityID": "2024-05-16T01:25:00-CME-001",
				"startTime": "2024-05-16T01:25Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "CME visible to the west in SOHO LASCO C2/C3 and STEREO A COR2. A source was not clearly visible in EUV imagery, but a candidate source may be old Active Region 3664.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30955/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1103,
					"type": "O",
					"halfAngle": 22,
					"latitude": 0,
					"longitude": 105
				}]
			},
			{
				"activityID": "2024-05-16T04:36:00-CME-001",
				"startTime": "2024-05-16T04:36Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "CME visible to the west in SOHO LASCO C2/C3 and STEREO A COR2. The source is not clear in EUV imagery, and this CME may be backsided.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30957/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 773,
					"type": "C",
					"halfAngle": 16,
					"latitude": -6,
					"longitude": 112
				}]
			},
			{
				"activityID": "2024-05-16T06:48:00-CME-001",
				"startTime": "2024-05-16T06:48Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "CME visible to the west in SOHO LASCO C2/C3 and STEREO A COR2. The source is not clear in EUV imagery, and this CME may be backsided.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30959/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1110,
					"type": "O",
					"halfAngle": 21,
					"latitude": -1,
					"longitude": 109
				}]
			},
			{
				"activityID": "2024-05-16T08:12:00-CME-001",
				"startTime": "2024-05-16T08:12Z",
				"sourceLocation": "S15E70",
				"activeRegionNum": null,
				"note": "Narrow CME visible to the east in SOHO LASCO C2/C3 and STEREO A COR2. The source is unclear, but faint opening field lines and some brightening can be seen around S15E70 in SDO AIA 193 starting around 2024-05-16T07:00Z. The eruption is not clearly visible in STEREO A EUV imagery or other wavelengths.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30970/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1298,
					"type": "O",
					"halfAngle": 17,
					"latitude": -5,
					"longitude": -70
				}]
			},
			{
				"activityID": "2024-05-16T13:38:00-CME-001",
				"startTime": "2024-05-16T13:38Z",
				"sourceLocation": "",
				"activeRegionNum": 13664,
				"note": "CME seen to the W in STEREO COR2A, not yet observed in SOHO LASCO due to a lengthy planned data gap that will end at 2024-05-17T02:10Z. The source is far-sided around the west limb, and very likely old AR 3664, estimated to be located around W120 at this time. Best observed as fieldline movement and an EUV wave starting around 2024-05-16T13:34Z in SDO AIA 171/193/211 and GOES SUVI 284.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30936/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 1452,
					"type": "O",
					"halfAngle": 27,
					"latitude": -2,
					"longitude": 120
				}]
			},
			{
				"activityID": "2024-05-16T18:00:00-CME-001",
				"startTime": "2024-05-16T18:00Z",
				"sourceLocation": "",
				"activeRegionNum": null,
				"note": "Bright three-lobed (and hence wide) heart-shaped northern CME fully covered by a night time data gap in STEREO. Its source is likely a super faint movement of a field line and a movement of matter on the NNW front at 18:54Z seen only in AIA 171 possibly confirming that the CME is backsided.",
				"link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/31002/-1",
				"linkedEvents": null,
				"cmeAnalyses": [{
					"isMostAccurate": true,
					"speed": 767,
					"type": "C",
					"halfAngle": 48,
					"latitude": 59,
					"longitude": null
				}]
			}
		],
		notifications: [
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-001",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30549/1",
				"messageIssueTime": "2024-05-08T01:43Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-08T01:39Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-002",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30550/1",
				"messageIssueTime": "2024-05-08T01:55Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T01:33Z. Flare peak time: 2024-05-08T01:41Z. Flare intensity: X1.0 class. Source region: N25W60 (Active Region 13663) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T01:33:00-FLR-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-003",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30552/1",
				"messageIssueTime": "2024-05-08T04:55Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-08T04:49Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-004",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30554/1",
				"messageIssueTime": "2024-05-08T06:55Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-08T06:50Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-005",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30556/1",
				"messageIssueTime": "2024-05-08T11:53Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-08T11:47Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-006",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30558/1",
				"messageIssueTime": "2024-05-08T13:10Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T04:37Z. Flare peak time: 2024-05-08T05:09Z. Flare intensity: X1.0 class. Source region: S22W10 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T04:37:00-FLR-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-007",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30560/1",
				"messageIssueTime": "2024-05-08T13:36Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T11:26Z. Flare peak time: 2024-05-08T12:04Z. Flare intensity: M8.5 class. Source region: S20W11 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T11:26:00-FLR-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-008",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30563/1",
				"messageIssueTime": "2024-05-08T13:45Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T06:44Z. Flare peak time: 2024-05-08T06:53Z. Flare intensity: M7.0 class. Source region: S21W18 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T06:44:00-FLR-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240508-AL-009",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30575/1",
				"messageIssueTime": "2024-05-08T16:50Z",
				"messageBody": "C-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-08T12:24Z. Estimated speed: ~776 km/s. Estimated opening half-angle: 45 deg. Direction (lon./lat.): 3/-5 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-08T12:24:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy, STEREO A, and Parker Solar Probe (glancing blow). The leading edge of the CME will reach Lucy at 2024-05-13T03:59Z, STEREO A at 2024-05-10T20:45Z, and flank of the CME will reach Parker Solar Probe at 2024-05-10T10:00Z (plu"
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-010",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30587/1",
				"messageIssueTime": "2024-05-08T17:54Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-08T17:49Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-011",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30588/1",
				"messageIssueTime": "2024-05-08T18:06Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T17:32Z. Flare peak time: 2024-05-08T17:53Z. Flare intensity: M7.9 class. Source region: S17W13 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T17:32:00-FLR-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240508-AL-012",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30592/1",
				"messageIssueTime": "2024-05-08T18:43Z",
				"messageBody": "C-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-08T05:36Z. Estimated speed: ~870 km/s. Estimated opening half-angle: 43 deg. Direction (lon./lat.): 9/-7 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-08T05:36:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy, STEREO A, and Parker Solar Probe (glancing blow). The leading edge will reach Lucy at 2024-05-12T08:48Z, STEREO A at 2024-05-10T07:28Z, and the leading edge or flank of the CME Parker Solar Probe at 2024-05-10T13:00Z (plus "
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-013",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30602/1",
				"messageIssueTime": "2024-05-08T22:35Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T21:00Z. Flare peak time: 2024-05-08T21:40Z. Flare intensity: X1.0 class. Source region: S20W17 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T21:00:00-FLR-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240508-AL-014",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30604/1",
				"messageIssueTime": "2024-05-08T22:38Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-08T21:28Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240509-AL-001",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30606/1",
				"messageIssueTime": "2024-05-09T09:00Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-09T08:53Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240509-AL-002",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30607/1",
				"messageIssueTime": "2024-05-09T12:03Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-09T08:45Z. Flare peak time: 2024-05-09T09:13Z. Flare intensity: X2.2 class. Source region: S20W25 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-09T08:45:00-FLR-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240509-AL-003",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30608/1",
				"messageIssueTime": "2024-05-09T12:36Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-08T22:05Z. Flare peak time: 2024-05-08T22:27Z. Flare intensity: M9.8 class. Source region: S22W22 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-08T22:05:00-FLR-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240509-AL-004",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30611/1",
				"messageIssueTime": "2024-05-09T14:00Z",
				"messageBody": "Solar energetic particle event forecasted at the orbit of SOHO starting at 2024-05-09T13:59Z. The flux of one or more of the >15.8 MeV protons channels exceeds 10^(-1) pfu/MeV within next few hours. NASA spacecraft at the L1 and near-Earth orbits can be impacted.\" Activity ID: 2024-05-09T13:59:00-SEP-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240509-AL-005",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30624/1",
				"messageIssueTime": "2024-05-09T16:39Z",
				"messageBody": "C-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-08T19:12Z. Estimated speed: ~828 km/s. Estimated opening half-angle: 38 deg. Direction (lon./lat.): -23/3 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-08T19:12:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Psyche (glancing blow), STEREO A, and Lucy (glancing blow). The leading edge of the CME will reach STEREO A at 2024-05-11T06:45Z, and the flank of the CME may reach Psyche at 2024-05-15T20:00Z and Lucy at 2024-05-14T00:00Z (plus"
			},
			{
				"messageType": "CME",
				"messageID": "20240509-AL-006",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30628/1",
				"messageIssueTime": "2024-05-09T17:04Z",
				"messageBody": "O-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-09T09:24Z. Estimated speed: ~1330 km/s. Estimated opening half-angle: 45 deg. Direction (lon./lat.): 19/-6 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-09T09:24:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy and STEREO A. The leading edge of the CME will reach Lucy at 2024-05-12T21:29Z and STEREO A at 2024-05-11T01:10Z (plus minus 7 hours). The simulation also indicates that the CME may impact NASA missions near Earth. Simulat"
			},
			{
				"messageType": "FLR",
				"messageID": "20240509-AL-007",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30635/1",
				"messageIssueTime": "2024-05-09T17:42Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-09T17:33Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240509-AL-008",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30636/1",
				"messageIssueTime": "2024-05-09T17:54Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-09T17:23Z. Flare peak time: 2024-05-09T17:44Z. Flare intensity: X1.1 class. Source region: S18W29 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-09T17:23:00-FLR-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240509-AL-009",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30649/1",
				"messageIssueTime": "2024-05-09T20:03Z",
				"messageBody": "O-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-08T22:24Z. Estimated speed: ~1130 km/s. Estimated opening half-angle: 40 deg. Direction (lon./lat.): 12/-16 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-08T22:24:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy and STEREO A. The leading edge of the CME will reach Lucy at 2024-05-12T18:10Z and STEREO A at 2024-05-10T19:07Z (plus minus 7 hours). The simulation also indicates that the CME may impact NASA missions near Earth. Simula"
			},
			{
				"messageType": "CME",
				"messageID": "20240509-AL-010",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30653/1",
				"messageIssueTime": "2024-05-09T21:24Z",
				"messageBody": "Update on CMEs with IDs 2024-05-08T05:36:00-CME-001 (see previous notification 20240508-AL-012), 2024-05-08T12:24:00-CME-001 (see previous notification 20240508-AL-009), 2024-05-08T19:12:00-CME-001 (see previous notification 20240509-AL-005), 2024-05-08T22:24:00-CME-001 (see previous notification 20240509-AL-009), and 2024-05-09T09:24:00-CME-001 (see previous notification 20240509-AL-006). Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that the CMEs may affect Psyche (glancing blow), Lucy, and STEREO A. The flank of the CMEs will reach Psyche at 2024-05-16T00:"
			},
			{
				"messageType": "CME",
				"messageID": "20240509-AL-011",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30662/1",
				"messageIssueTime": "2024-05-09T23:35Z",
				"messageBody": "C-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-09T18:23Z. Estimated speed: ~895 km/s. Estimated opening half-angle: 44 deg. Direction (lon./lat.): 30/-6 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-09T18:23:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy, STEREO A, and Parker Solar Probe (glancing blow). The leading edge or flank of the CME will reach Lucy at 2024-05-13T03:24Z, STEREO A at 2024-05-11T01:31Z, and Parker Solar Probe at 2024-05-10T21:00Z (plus minus 7 hours). "
			},
			{
				"messageType": "FLR",
				"messageID": "20240510-AL-001",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30667/1",
				"messageIssueTime": "2024-05-10T06:51Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-10T06:41Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240510-AL-002",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30668/1",
				"messageIssueTime": "2024-05-10T11:37Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-10T06:27Z. Flare peak time: 2024-05-10T06:54Z. Flare intensity: X3.9 class. Source region: S18W37 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-10T06:27:00-FLR-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240510-AL-003",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30674/1",
				"messageIssueTime": "2024-05-10T13:38Z",
				"messageBody": "O-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-10T07:12Z. Estimated speed: ~1018 km/s. Estimated opening half-angle: 41 deg. Direction (lon./lat.): 31/-2 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-10T07:12:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy, STEREO A, and Parker Solar Probe (glancing blow). The leading edge or flank of the CME may reach Lucy at 2024-05-14T12:28Z, STEREO A at 2024-05-12T07:16Z, and Parker Solar Probe at 2024-05-12T02:00Z (plus minus 7 hours). "
			},
			{
				"messageType": "SEP",
				"messageID": "20240510-AL-004",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30678/1",
				"messageIssueTime": "2024-05-10T13:46Z",
				"messageBody": "Solar energetic particle event detected by GOES. The flux of > 10 MeV protons exceeds 10 pfu starting at 2024-05-10T13:35Z. NASA spacecraft at MEO, GEO and other high-altitude orbits and high-inclination LEO can be impacted. Activity ID: 2024-05-10T13:35:00-SEP-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240510-AL-005",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30679/1",
				"messageIssueTime": "2024-05-10T14:12Z",
				"messageBody": "Solar energetic particle event detected by GOES and SOHO. At GOES, the flux of > 10 MeV protons exceeds 10 pfu starting at 2024-05-10T13:35Z. The flux of one or more of the >15.8 MeV protons channels exceeds 10^(-1) pfu/MeV starting at 2024-05-10T12:59Z. NASA spacecraft at MEO, GEO and other high-altitude orbits and high-inclination LEO can be impacted. Activity ID: 2024-05-10T13:35:00-SEP-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240510-AL-006",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30681/1",
				"messageIssueTime": "2024-05-10T14:15Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-10T14:08Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240510-AL-007",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30682/1",
				"messageIssueTime": "2024-05-10T14:28Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-10T13:58Z. Flare peak time: 2024-05-10T14:11Z. Flare intensity: M5.9 class. Source region: S16W40 (Active Region 13664) (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-10T13:58:00-FLR-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240510-AL-008",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30685/1",
				"messageIssueTime": "2024-05-10T15:03Z",
				"messageBody": "Solar energetic particle event detected by STEREO A. The flux of 13-100 MeV protons exceeds 10^(-1) pfu/MeV starting at 2024-05-10T14:50Z. Activity ID: 2024-05-10T14:50:00-SEP-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240510-AL-009",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30686/1",
				"messageIssueTime": "2024-05-10T15:17Z",
				"messageBody": "Solar energetic particle event detected by STEREO A. The flux of 13-100 MeV protons exceeds 10^(-1) pfu/MeV starting at 2024-05-10T14:50Z. Activity ID: 2024-05-10T14:50:00-SEP-001."
			},
			{
				"messageType": "IPS",
				"messageID": "20240510-AL-010",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30689/1",
				"messageIssueTime": "2024-05-10T17:01Z",
				"messageBody": "Significant interplanetary shock detected by ACE at L1 at 2024-05-10T16:36Z. The shock is likely caused by the CME with ID 2024-05-07T03:12:00-CME-001, CME with ID 2024-05-07T05:24:00-CME-001 and/or CME with ID 2024-05-08T05:36:00-CME-001 (see notifications 20240508-AL-012 and 20240509-AL-010). Strong magnetospheric compression and geomagnetic storm expected. This arrival signature is still developing and analysis is ongoing. Activity ID: 2024-05-10T16:36:00-IPS-001."
			},
			{
				"messageType": "MPC",
				"messageID": "20240510-AL-011",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30691/1",
				"messageIssueTime": "2024-05-10T17:33Z",
				"messageBody": "Strong compression of the magnetosphere detected. Simulations carried out at NASA Community Coordinated Modeling Center indicate that the magnetopause separating magnetospheric and solar wind plasma is close to the geosynchronous orbit starting at 2024-05-10T18:01Z. NASA spacecraft at the geosynchronous orbits may be exposed to solar wind plasma and magnetic field conditions. Activity ID: 2024-05-10T18:01:00-MPC-001."
			},
			{
				"messageType": "MPC",
				"messageID": "20240510-AL-012",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30692/1",
				"messageIssueTime": "2024-05-10T17:39Z",
				"messageBody": "Strong compression of the magnetosphere detected. Simulations carried out at NASA Community Coordinated Modeling Center indicate that the magnetopause separating magnetospheric and solar wind plasma is close to the geosynchronous orbit starting at 2024-05-10T18:01Z. The activity is associated with the Interplanetary Shock with ID 2024-05-10T16:36:00-IPS-001 (see notification 20240510-AL-010) which is associated with the arrival of the CME with ID 2024-05-07T03:12:00-CME-001, CME with ID 2024-05-07T05:24:00-CME-001, and/or CME with ID 2024-05-08T05:36:00-CME-001 (see notifications 20240508-AL-012 and 20240509-AL-010). NASA spacecraft at the geosynchronous orbits may be exposed to solar wind p"
			},
			{
				"messageType": "GST",
				"messageID": "20240510-AL-013",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30694/1",
				"messageIssueTime": "2024-05-10T18:44Z",
				"messageBody": "Ongoing space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 7.67 (severe) during the synoptic period 2024-05-10T15:00Z to 2024-05-10T18:00Z. NASA spacecraft at GEO, MEO, polar and other orbits passing through or in the vicinity of the Earth's ring current and auroral regions can be impacted. Activity ID: 2024-05-10T15:00:00-GST-001."
			},
			{
				"messageType": "GST",
				"messageID": "20240510-AL-014",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30695/1",
				"messageIssueTime": "2024-05-10T19:19Z",
				"messageBody": "Ongoing space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 7.67 (severe) during the synoptic period 2024-05-10T15:00Z to 2024-05-10T18:00Z. The storm is caused by the Interplanetary Shock with ID 2024-05-10T16:36:00-IPS-001 (see notification 20240510-AL-010) which is associated with the arrival of the CME with ID 2024-05-07T03:12:00-CME-001, CME with ID 2024-05-07T05:24:00-CME-001, and/or CME with ID 2024-05-08T05:36:00-CME-001 (see notifications 20240508-AL-012 and 20240509-AL-010). NASA spacecraft at GEO, MEO, polar and other orbits passing through or in the vicinity of the Earth's ring current and auroral regions can be impacted. Activity ID: 2024-05-"
			},
			{
				"messageType": "GST",
				"messageID": "20240510-AL-015",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30702/1",
				"messageIssueTime": "2024-05-10T21:35Z",
				"messageBody": "Intensifying space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 8.67 (severe) during the synoptic period 2024-05-10T18:00Z to 2024-05-10T21:00Z. The storm is caused by CME with ID 2024-05-07T03:12:00-CME-001, CME with ID 2024-05-07T05:24:00-CME-001 and CME with ID 2024-05-08T05:36:00-CME-001 (see notification(s) 20240508-AL-012, 20240509-AL-010). NASA spacecraft at GEO, MEO, polar and other orbits passing through or in the vicinity of the Earth's ring current and auroral regions can be impacted. Activity ID: 2024-05-10T15:00:00-GST-001."
			},
			{
				"messageType": "GST",
				"messageID": "20240510-AL-016",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30703/1",
				"messageIssueTime": "2024-05-10T22:01Z",
				"messageBody": "Intensifying space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 8.67 (severe) during the synoptic period 2024-05-10T18:00Z to 2024-05-10T21:00Z. The storm is caused by the Interplanetary Shock with ID 2024-05-10T16:36:00-IPS-001 (see notification 20240510-AL-010) which is associated with the arrival of one or more of the following CMEs: CME with ID 2024-05-08T05:36:00-CME-001 (see notifications 20240508-AL-012, 20240509-AL-010), CME with ID 2024-05-08T12:24:00-CME-001 (see notifications 20240508-AL-009, 20240509-AL-010) and/or possibly CMEs with ID 2024-05-08T22:24:00-CME-001 (see notifications 20240509-AL-009, 20240509-AL-010) and 2024-05-09T09:24:00-CM"
			},
			{
				"messageType": "IPS",
				"messageID": "20240510-AL-017",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30705/1",
				"messageIssueTime": "2024-05-10T22:24Z",
				"messageBody": "Significant interplanetary shock detected by DSCOVR at L1 at 2024-05-10T21:39Z. The shock is likely caused by the arrival of CME with ID 2024-05-08T22:24:00-CME-001 (see notifications 20240509-AL-009, 20240509-AL-010) and/or CME with ID 2024-05-09T09:24:00-CME-001 (see notifications 20240509-AL-006, 20240509-AL-010). Strong magnetospheric compression and geomagnetic storm expected. Activity ID: 2024-05-10T21:39:00-IPS-001."
			},
			{
				"messageType": "MPC",
				"messageID": "20240511-AL-001",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30706/1",
				"messageIssueTime": "2024-05-11T00:12Z",
				"messageBody": "Strong compression of the magnetosphere continues. Simulations carried out at NASA Community Coordinated Modeling Center indicate that the magnetopause separating magnetospheric and solar wind plasma has been intermittently close to the geosynchronous orbit since 2024-05-10T18:01Z, after the first Interplanetary Shock of today with ID 2024-05-10T16:36:00-IPS-001 (see notifications 20240510-AL-010, 20240510-AL-011, 20240510-AL-012). According to the simulations, the magnetopause is currently close to the geosynchronous orbit following the second Interplanetary Shock with ID 2024-05-10T21:39:00-IPS-001 (see notification 20240510-AL-017). The activity is associated with the arrival of CME with "
			},
			{
				"messageType": "GST",
				"messageID": "20240511-AL-002",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30707/1",
				"messageIssueTime": "2024-05-11T00:34Z",
				"messageBody": "Intensifying space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 9 (extreme) during the synoptic period 2024-05-10T21:00Z to 2024-05-11T00:00Z. The storm is caused by CME with ID 2024-05-08T05:36:00-CME-001 (see notification(s) 20240508-AL-012, 20240509-AL-010), CME with ID 2024-05-08T12:24:00-CME-001 (see notification(s) 20240508-AL-009, 20240509-AL-010), CME with ID 2024-05-08T22:24:00-CME-001 (see notification(s) 20240509-AL-009, 20240509-AL-010) and CME with ID 2024-05-09T09:24:00-CME-001 (see notification(s) 20240509-AL-006, 20240509-AL-010). NASA spacecraft at GEO, MEO, polar and other orbits passing through or in the vicinity of the Earth's ring cu"
			},
			{
				"messageType": "GST",
				"messageID": "20240511-AL-003",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30708/1",
				"messageIssueTime": "2024-05-11T00:39Z",
				"messageBody": "Intensifying space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 9 (extreme) during the synoptic period 2024-05-10T21:00Z to 2024-05-11T00:00Z. The storm is caused by the Interplanetary Shock with ID 2024-05-10T21:39:00-IPS-001 (see notification 20240510-AL-017) and the earlier Interplanetary Shock with ID 2024-05-10T16:36:00-IPS-001 (see notification 20240510-AL-010) which are associated with the arrivals of CME with ID 2024-05-08T05:36:00-CME-001 (see notifications 20240508-AL-012, 20240509-AL-010), CME with ID 2024-05-08T12:24:00-CME-001 (see notifications 20240508-AL-009, 20240509-AL-010), CME with ID 2024-05-08T22:24:00-CME-001 (see notifications 202"
			},
			{
				"messageType": "FLR",
				"messageID": "20240511-AL-004",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30712/1",
				"messageIssueTime": "2024-05-11T01:27Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-11T01:15Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240511-AL-005",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30713/1",
				"messageIssueTime": "2024-05-11T01:49Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-11T01:10Z. Flare peak time: 2024-05-11T01:23Z. Flare intensity: X5.8 class. Source region: S17W47 (based on SDO imagery). Increased energetic proton fluxes possible. Updates on this event will be provided when available. Activity ID: 2024-05-11T01:10:00-FLR-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240511-AL-006",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30715/1",
				"messageIssueTime": "2024-05-11T02:30Z",
				"messageBody": "Solar energetic particle event detected by GOES. The flux of > 100 MeV protons exceeds 1 pfu starting at 2024-05-11T02:10Z. NASA Spacecraft at MEO, GEO and other high-altitude orbits and high-inclination LEO can be impacted. Activity ID: 2024-05-11T02:10:00-SEP-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240511-AL-007",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30716/1",
				"messageIssueTime": "2024-05-11T02:46Z",
				"messageBody": "Solar energetic particle event detected by GOES. The flux of > 100 MeV protons exceeds 1 pfu starting at 2024-05-11T02:10Z. NASA Spacecraft at MEO, GEO and other high-altitude orbits and high-inclination LEO can be impacted. Activity ID: 2024-05-11T02:10:00-SEP-001."
			},
			{
				"messageType": "SEP",
				"messageID": "20240511-AL-008",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30718/1",
				"messageIssueTime": "2024-05-11T04:13Z",
				"messageBody": "Solar energetic particle event detected by STEREO A. The flux of 13-100 MeV protons exceeds 10^(-1) pfu/MeV starting at 2024-05-11T04:07Z. Activity ID: 2024-05-11T04:07:00-SEP-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240511-AL-009",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30721/1",
				"messageIssueTime": "2024-05-11T04:50Z",
				"messageBody": "O-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-11T01:36Z. Estimated speed: ~1372 km/s. Estimated opening half-angle: 49 deg. Direction (lon./lat.): 47/-1 in Heliocentric Earth Equatorial coordinates. NASA spacecraft near Earth and between Earth and Mars can be affected. The above parameters are preliminary, the CME is still being analyzed and updates will be provided when available. Activity ID: 2024-05-11T01:36:00-CME-001"
			},
			{
				"messageType": "FLR",
				"messageID": "20240511-AL-010",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30723/1",
				"messageIssueTime": "2024-05-11T11:37Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-11T11:31Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "FLR",
				"messageID": "20240511-AL-011",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30724/1",
				"messageIssueTime": "2024-05-11T12:33Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-11T11:15Z. Flare peak time: 2024-05-11T11:44Z. Flare intensity: X1.5 class. Source region: S19W60 (Active Region 13664) (based on SDO imagery). Ongoing elevation in energetic proton fluxes may be enhanced by this event. Updates on this event will be provided when available. Activity ID: 2024-05-11T11:15:00-FLR-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240511-AL-012",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30727/1",
				"messageIssueTime": "2024-05-11T14:23Z",
				"messageBody": "Update on CME with ID 2024-05-11T01:36:00-CME-001 (see previous notification 20240511-AL-009). Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that this CME may affect Lucy, Mars, Parker Solar Probe, STEREO A, and OSIRIS-APEX (glancing blow). The leading edge of the CME will reach Lucy at 2024-05-14T18:37Z, Mars at 2024-05-13T17:42Z, Parker Solar Probe at 2024-05-12T05:42Z, STEREO A at 2024-05-12T20:25Z (plus minus 7 hours), and the flank of the CME will reach OSIRIS-APEX at 2024-05-13T04:00Z (plus minus 7 hours). The simulation also indicates that the CME may "
			},
			{
				"messageType": "SEP",
				"messageID": "20240511-AL-013",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30728/1",
				"messageIssueTime": "2024-05-11T15:03Z",
				"messageBody": "Solar energetic particle event detected by STEREO A. The flux of 13-100 MeV protons exceeds 10^(-1) pfu/MeV starting at 2024-05-11T04:07Z. Activity ID: 2024-05-11T04:07:00-SEP-001."
			},
			{
				"messageType": "FLR",
				"messageID": "20240511-AL-014",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30730/1",
				"messageIssueTime": "2024-05-11T15:13Z",
				"messageBody": "Significant flare detected by GOES. Flare intensity has crossed the threshold of M5.0. Flare M5.0 crossing time: 2024-05-11T15:09Z. Increased energetic proton fluxes possible. Updates on this event will be provided when available."
			},
			{
				"messageType": "GST",
				"messageID": "20240511-AL-015",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30731/1",
				"messageIssueTime": "2024-05-11T15:14Z",
				"messageBody": "Intensifying space weather storm in the Earth's magnetosphere. Geomagnetic Kp index has reached level 9 (extreme) during the synoptic period 2024-05-11T09:00Z to 2024-05-11T12:00Z. The storm is caused by the Interplanetary Shock with ID 2024-05-10T21:39:00-IPS-001 (see notification 20240510-AL-017) and the earlier Interplanetary Shock with ID 2024-05-10T16:36:00-IPS-001 (see notification 20240510-AL-010) which are associated with the arrivals of CME with ID 2024-05-08T05:36:00-CME-001 (see notifications 20240508-AL-012, 20240509-AL-010), CME with ID 2024-05-08T12:24:00-CME-001 (see notifications 20240508-AL-009, 20240509-AL-010), CME with ID 2024-05-08T22:24:00-CME-001 (see notifications 202"
			},
			{
				"messageType": "FLR",
				"messageID": "20240511-AL-016",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30732/1",
				"messageIssueTime": "2024-05-11T15:41Z",
				"messageBody": "Significant flare detected by GOES. Flare start time: 2024-05-11T14:46Z. Flare peak time: 2024-05-11T15:25Z. Flare intensity: M8.8 class. Source region: S17W53 (Active Region 13664) (based on SDO imagery). Ongoing elevation in energetic proton fluxes may be enhanced by this event. Updates on this event will be provided when available. Activity ID: 2024-05-11T14:46:00-FLR-001."
			},
			{
				"messageType": "CME",
				"messageID": "20240511-AL-017",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30748/1",
				"messageIssueTime": "2024-05-11T20:49Z",
				"messageBody": "O-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-11T16:24Z. Estimated speed: ~1088 km/s. Estimated opening half-angle: 22 deg. Direction (lon./lat.): 53/-1 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-11T16:24:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that the CME may impact Parker Solar Probe (glancing blow) and STEREO A (glancing blow). The flank of the CME will reach Parker Solar Probe at 2024-05-13T09:00Z and STEREO A at 2024-05-15T15:00Z (plus minus 7 hours). Links to the movies of the modeled "
			},
			{
				"messageType": "CME",
				"messageID": "20240512-AL-001",
				"messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30758/1",
				"messageIssueTime": "2024-05-12T13:30Z",
				"messageBody": "C-type CME detected by STEREO A / SOHO. Start time of the event: 2024-05-12T03:48Z. Estimated speed: ~602 km/s. Estimated opening half-angle: 47 deg. Direction (lon./lat.): 137/-39 in Heliocentric Earth Equatorial coordinates. Activity ID: 2024-05-12T03:48:00-CME-001 Based on preliminary analysis by the Moon to Mars Space Weather Analysis Office and heliospheric modeling carried out at NASA Community Coordinated Modeling Center, it is estimated that the CME may impact Mars (glancing blow), OSIRIS-APEX (glancing blow), Parker Solar Probe (glancing blow), and Solar Orbiter (glancing blow). The flank of the CME may reach Mars at 2024-05-15T22:00Z, OSIRIS-APEX at 2024-05-14T20:00Z, Parker Solar "
			}
		]
	};
	// src/engine/lightTime.ts
	var EARTH = {
		a: [1.00000261, 562e-8],
		e: [.01671123, -4392e-8],
		i: [-1531e-8, -.01294668],
		L: [100.46457166, 35999.37244981],
		peri: [102.93768193, .32327364],
		node: [0, 0]
	};
	var MARS = {
		a: [1.52371034, 1847e-8],
		e: [.0933941, 7882e-8],
		i: [1.84969142, -.00813131],
		L: [-4.55343205, 19140.30268499],
		peri: [-23.94362959, .44441088],
		node: [49.55953891, -.29257343]
	};
	var AU_KM = 149597870.7;
	var C_KM_S = 299792.458;
	var RAD$1 = Math.PI / 180;
	/** Heliocentric ecliptic position (J2000) in AU. */
	function heliocentric(el, date) {
		const T = (date.getTime() / 864e5 + 2440587.5 - 2451545) / 36525;
		const v = (p) => p[0] + p[1] * T;
		const a = v(el.a);
		const e = v(el.e);
		const i = v(el.i) * RAD$1;
		const L = v(el.L);
		const peri = v(el.peri);
		const node = v(el.node);
		const w = (peri - node) * RAD$1;
		const O = node * RAD$1;
		let M = ((L - peri) % 360 + 540) % 360 - 180;
		M *= RAD$1;
		let E = M + e * Math.sin(M);
		for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
		const xp = a * (Math.cos(E) - e);
		const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
		return [
			(Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)) * xp + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)) * yp,
			(Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)) * xp + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)) * yp,
			Math.sin(w) * Math.sin(i) * xp + Math.cos(w) * Math.sin(i) * yp
		];
	}
	function earthMarsDistanceAu(date) {
		const [x1, y1, z1] = heliocentric(EARTH, date);
		const [x2, y2, z2] = heliocentric(MARS, date);
		return Math.hypot(x2 - x1, y2 - y1, z2 - z1);
	}
	/** One-way radio signal time between Earth and Mars, in minutes. */
	function earthMarsLightMinutes(date) {
		return earthMarsDistanceAu(date) * AU_KM / C_KM_S / 60;
	}
	/**
	* One-way radio time between the demo ship and Earth on a mission day, in
	* minutes. The ship leaves Earth on day 1 and reaches Mars on the last day;
	* it is placed at a growing share of the Earth–Mars distance on that date
	* (eased, so it speeds up after launch and slows before arrival). An
	* illustration of a transit, not a trajectory.
	*/
	function shipEarthLightMinutes(missionDay, totalDays, at) {
		const f = Math.min(1, Math.max(0, (missionDay - 1) / Math.max(1, totalDays - 1)));
		return (.5 - Math.cos(Math.PI * f) / 2) * earthMarsLightMinutes(at);
	}
	// src/utils/dates.ts
	var DAY_MS = 864e5;
	var EPOCH_MS = Date.parse(MISSION.epochUtc);
	function clampDay(day) {
		if (!Number.isFinite(day)) return MISSION.defaultDay;
		return Math.min(MISSION.totalDays, Math.max(1, Math.round(day)));
	}
	/** UTC instant for a mission day plus minutes after 00:00 UTC. */
	function missionDayToIso(missionDay, minuteOfDay = 0) {
		return new Date(EPOCH_MS + (missionDay - 1) * DAY_MS + minuteOfDay * 6e4).toISOString();
	}
	/** Reading stamp used everywhere: "D042 06:41" (mission day + ship time UTC). */
	function formatReadingStamp(missionDay, iso) {
		const t = Date.parse(iso);
		if (Number.isNaN(t)) return `D${padDay(missionDay)}`;
		const d = new Date(t);
		return `D${padDay(missionDay)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
	}
	/** "HH:MM" ship time to minutes after 00:00, or null when invalid. */
	function shipTimeToMinutes(value) {
		const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
		return m ? Number(m[1]) * 60 + Number(m[2]) : null;
	}
	/** Current UTC time of day as "HH:MM". */
	function currentShipTime(now = /* @__PURE__ */ new Date()) {
		return `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
	}
	function padDay(day) {
		return String(day).padStart(3, "0");
	}
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "UTC"
	});
	new Intl.DateTimeFormat(void 0, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	});
	new Intl.DateTimeFormat(void 0, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
	new Intl.DateTimeFormat(void 0, {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "2-digit"
	});
	new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
	/** Ship-to-Earth one-way signal time on a mission day of the demo transit, in minutes. */
	function missionSignalMinutes(missionDay) {
		return shipEarthLightMinutes(missionDay, MISSION.totalDays, new Date(missionDayToIso(missionDay, 720)));
	}
	// src/data/scenarios.ts
	/** Events shared by every scenario: small, controlled anomalies in the base mission. */
	var BASE_EVENTS = [
		{
			id: "base-short-sleep",
			metrics: [
				"sleep",
				"pvt",
				"mood"
			],
			title: "Two short sleep periods",
			startDay: 27,
			endDay: 28,
			kind: "health",
			description: "Synthetic schedule shift: sleep below the configured target on two consecutive nights."
		},
		{
			id: "base-ared-maintenance",
			metrics: ["aredMinutes"],
			title: "ARED maintenance day",
			startDay: 51,
			endDay: 51,
			kind: "operations",
			description: "Synthetic equipment maintenance shortened the resistive exercise session."
		},
		{
			id: "base-glucose-post-meal",
			metrics: ["bloodGlucose"],
			title: "Post-meal glucose reading",
			startDay: 63,
			endDay: 63,
			kind: "health",
			description: "A single synthetic glucose reading taken after a meal, above the configured range."
		}
	];
	var SCENARIOS = {
		nominal: {
			id: "nominal",
			code: "A",
			name: "Nominal mission",
			summary: "Stable synthetic readings, good countermeasure adherence and quiet demo space weather. Opens on mission day 42.",
			focusDay: 42,
			storyDays: null,
			events: BASE_EVENTS
		},
		cardiovascular: {
			id: "cardiovascular",
			code: "B",
			name: "Cardiovascular caution",
			summary: "Resting heart rate and blood pressure drift upward from day 96 and cross the configured caution limits. Opens on mission day 118.",
			focusDay: 118,
			storyDays: [112, 132],
			events: [...BASE_EVENTS, {
				id: "cv-drift",
				metrics: ["heartRate", "bloodPressure"],
				title: "Cardiovascular drift",
				startDay: 96,
				endDay: 132,
				kind: "health",
				description: "Synthetic gradual rise in resting heart rate and blood pressure, peaking around days 110–126 and easing afterwards."
			}]
		},
		sep: {
			id: "sep",
			code: "C",
			name: "Solar particle event",
			summary: "A simulated solar particle event: precursor on day 130, event on days 131–133, all clear on day 134. A documented synthetic overlay raises the dosimeter's daily dose and sleep is interrupted. Opens on mission day 131.",
			focusDay: 131,
			storyDays: [130, 134],
			events: [
				...BASE_EVENTS,
				{
					id: "sep-precursor",
					metrics: ["radiation"],
					title: "Simulated flare precursor",
					startDay: 130,
					endDay: 130,
					kind: "environment",
					description: "Scenario simulation: a large flare is reported and particle arrival is possible. Not a DONKI record."
				},
				{
					id: "sep-event",
					metrics: [
						"radiation",
						"sleep",
						"pvt",
						"hydration",
						"aredMinutes"
					],
					title: "Simulated SEP event",
					startDay: 131,
					endDay: 133,
					kind: "environment",
					description: "Scenario simulation of a solar energetic particle event. Not a DONKI record. Dosimeter values on these days include a documented synthetic overlay (see Data Sources)."
				}
			]
		}
	};
	var SCENARIO_ORDER = [
		"nominal",
		"cardiovascular",
		"sep"
	];
	function isScenarioId(value) {
		return value === "nominal" || value === "cardiovascular" || value === "sep";
	}
	// src/types/health.ts
	var STATUS_RANK = {
		NOMINAL: 0,
		CAUTION: 1,
		CRITICAL: 2
	};
	var PRIMARY_METRIC_IDS = [
		"heartRate",
		"bloodPressure",
		"bloodGlucose",
		"bodyTemperature",
		"sleep",
		"mood",
		"aredMinutes",
		"radiation"
	];
	var SUPPLEMENTAL_METRIC_IDS = [
		"pvt",
		"hydration",
		"symptoms"
	];
	var ALL_METRIC_IDS = [...PRIMARY_METRIC_IDS, ...SUPPLEMENTAL_METRIC_IDS];
	var BODY_SYSTEM_IDS = [
		"neuroOcular",
		"cardiovascular",
		"musculoskeletal",
		"immuneRadiation",
		"metabolicCircadian"
	];
	// src/utils/formatting.ts
	function isBloodPressure(v) {
		return typeof v === "object" && v !== null && "systolic" in v && "diastolic" in v;
	}
	function isSymptomValue(v) {
		return typeof v === "object" && v !== null && "blurredVision" in v;
	}
	var METRIC_UNITS = {
		heartRate: "bpm",
		bloodPressure: "mmHg",
		bloodGlucose: "mg/dL",
		bodyTemperature: "°C",
		sleep: "h",
		mood: "/ 5",
		aredMinutes: "min",
		radiation: "mSv",
		pvt: "ms",
		hydration: "L",
		symptoms: ""
	};
	var DECIMALS = {
		heartRate: 0,
		bloodPressure: 0,
		bloodGlucose: 0,
		bodyTemperature: 1,
		sleep: 1,
		mood: 1,
		aredMinutes: 0,
		radiation: 1,
		pvt: 0,
		hydration: 1,
		symptoms: 0
	};
	var numberFormats = /* @__PURE__ */ new Map();
	function nf(decimals) {
		let f = numberFormats.get(decimals);
		if (!f) {
			f = new Intl.NumberFormat(void 0, {
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals
			});
			numberFormats.set(decimals, f);
		}
		return f;
	}
	function formatNumber(value, decimals) {
		return nf(decimals).format(value);
	}
	var SYMPTOM_LABELS = {
		blurredVision: "blurred vision",
		eyePressure: "eye pressure",
		headache: "headache",
		otherSymptom: "other symptom"
	};
	function listSymptoms(v) {
		return Object.keys(SYMPTOM_LABELS).filter((k) => v[k]).map((k) => SYMPTOM_LABELS[k]);
	}
	/** Value text without unit. */
	function formatMetricValue(metricId, value) {
		if (isBloodPressure(value)) return `${Math.round(value.systolic)}/${Math.round(value.diastolic)}`;
		if (isSymptomValue(value)) {
			const s = listSymptoms(value);
			return s.length === 0 ? "None reported" : capitalize(s.join(", "));
		}
		return formatNumber(value, DECIMALS[metricId]);
	}
	function formatWithUnit(metricId, value) {
		const unit = METRIC_UNITS[metricId];
		const text = formatMetricValue(metricId, value);
		if (!unit) return text;
		return unit.startsWith("/") ? `${text} ${unit}` : `${text}\u00a0${unit}`;
	}
	function formatDose(msv, decimals = 2) {
		return `${formatNumber(msv, decimals)}\u00a0mSv`;
	}
	function signed(n, decimals) {
		if (Math.abs(n) < 10 ** -decimals / 2) return "±0";
		const s = formatNumber(Math.abs(n), decimals);
		return n > 0 ? `+${s}` : `−${s}`;
	}
	/** Change from the previous reading, e.g. "+3", "−2/+1". Null when not comparable. */
	function formatDelta(metricId, current, previous) {
		if (previous === void 0) return null;
		if (isBloodPressure(current) && isBloodPressure(previous)) return `${signed(current.systolic - previous.systolic, 0)}/${signed(current.diastolic - previous.diastolic, 0)}`;
		if (typeof current === "number" && typeof previous === "number") return signed(current - previous, DECIMALS[metricId]);
		return null;
	}
	function capitalize(s) {
		return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
	}
	// src/utils/validation.ts
	/**
	* Validation for user input and for data read back from storage or the network.
	* Nothing is trusted until it passes these checks.
	*/
	var isRecord$1 = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
	var isFiniteNumber = (x) => typeof x === "number" && Number.isFinite(x);
	var isIsoDate = (x) => typeof x === "string" && !Number.isNaN(Date.parse(x));
	var isMetricId = (x) => typeof x === "string" && ALL_METRIC_IDS.includes(x);
	var isMissionDay = (x) => Number.isInteger(x) && x >= 1 && x <= MISSION.totalDays;
	var TREND_TABS = [
		"heartRate",
		"bloodPressure",
		"bloodGlucose",
		"bodyTemperature",
		"sleepMood",
		"ared",
		"radiation",
		"pvtHydration"
	];
	var TREND_WINDOWS = [
		7,
		30,
		90,
		180
	];
	var NUMBER_PATTERN = /^-?\d+([.,]\d+)?$/;
	function parseNumber(raw) {
		const trimmed = raw.trim();
		if (!NUMBER_PATTERN.test(trimmed)) return null;
		const n = Number(trimmed.replace(",", "."));
		return Number.isFinite(n) ? n : null;
	}
	var NUMERIC_SPECS = {
		heartRate: {
			label: "Heart rate",
			min: HEART_RATE.entry.min,
			max: HEART_RATE.entry.max,
			decimals: 0
		},
		bloodGlucose: {
			label: "Glucose",
			min: BLOOD_GLUCOSE.entry.min,
			max: BLOOD_GLUCOSE.entry.max,
			decimals: 0
		},
		bodyTemperature: {
			label: "Temperature",
			min: BODY_TEMPERATURE.entry.min,
			max: BODY_TEMPERATURE.entry.max,
			decimals: 1
		},
		sleep: {
			label: "Sleep",
			min: SLEEP.entry.min,
			max: SLEEP.entry.max,
			decimals: 1
		},
		mood: {
			label: "Mood",
			min: MOOD.entry.min,
			max: MOOD.entry.max,
			decimals: 1
		},
		aredMinutes: {
			label: "ARED minutes",
			min: ARED.entry.min,
			max: ARED.entry.max,
			decimals: 0
		},
		radiation: {
			label: "Cumulative dose",
			min: RADIATION.entry.min,
			max: RADIATION.entry.max,
			decimals: 2
		},
		pvt: {
			label: "Reaction time",
			min: PVT.entry.min,
			max: PVT.entry.max,
			decimals: 0
		},
		hydration: {
			label: "Fluid intake",
			min: HYDRATION.entry.min,
			max: HYDRATION.entry.max,
			decimals: 1
		}
	};
	function checkNumber(raw, spec, unit) {
		if (raw.trim() === "") return { error: `Enter a ${spec.label.toLowerCase()} value.` };
		const n = parseNumber(raw);
		if (n === null) return { error: `${spec.label} must be a number, for example ${spec.min + Math.round((spec.max - spec.min) / 4)}.` };
		if (n < spec.min || n > spec.max) return { error: `${spec.label} must be between ${spec.min} and ${spec.max}${unit ? ` ${unit}` : ""}. Check the device reading and units.` };
		const factor = 10 ** spec.decimals;
		return { value: Math.round(n * factor) / factor };
	}
	function validateMeasurement(draft, ctx) {
		const errors = {};
		const dayNum = Number(draft.missionDay);
		if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > MISSION.totalDays) errors.missionDay = `Mission day must be a whole number from 1 to ${MISSION.totalDays}.`;
		const minutes = shipTimeToMinutes(draft.shipTime);
		if (minutes === null) errors.recordedAt = "Enter the ship time (UTC) as HH:MM, for example 07:30.";
		const notes = draft.notes.trim();
		if (notes.length > 280) errors.notes = `Notes must be 280 characters or fewer (currently ${notes.length}).`;
		let value;
		const unit = METRIC_UNITS[draft.metricId];
		if (draft.metricId === "bloodPressure") {
			const sysSpec = {
				label: "Systolic",
				min: BLOOD_PRESSURE.entry.systolic.min,
				max: BLOOD_PRESSURE.entry.systolic.max,
				decimals: 0
			};
			const diaSpec = {
				label: "Diastolic",
				min: BLOOD_PRESSURE.entry.diastolic.min,
				max: BLOOD_PRESSURE.entry.diastolic.max,
				decimals: 0
			};
			const s = checkNumber(draft.systolic, sysSpec, "mmHg");
			const d = checkNumber(draft.diastolic, diaSpec, "mmHg");
			if ("error" in s) errors.systolic = s.error;
			if ("error" in d) errors.diastolic = d.error;
			if ("value" in s && "value" in d) {
				if (s.value <= d.value) errors.systolic = "Systolic (top number) must be higher than diastolic (bottom number).";
				else value = {
					systolic: s.value,
					diastolic: d.value
				};
			}
		} else if (draft.metricId === "symptoms") value = { ...draft.symptoms };
		else {
			const spec = NUMERIC_SPECS[draft.metricId];
			if (spec) {
				const r = checkNumber(draft.value, spec, unit);
				if ("error" in r) errors.value = r.error;
				else value = r.value;
			}
			if (draft.metricId === "radiation" && typeof value === "number") {
				if (value + 1e-9 < ctx.previousCumulativeDose) {
					errors.value = `A cumulative dosimeter reading cannot be lower than the previous day's ${ctx.previousCumulativeDose.toFixed(2)} mSv. Check the device and the mission day.`;
					value = void 0;
				} else if (ctx.nextManualDose !== null && value > ctx.nextManualDose + 1e-9) {
					errors.value = `This reading is higher than a later logged reading (${ctx.nextManualDose.toFixed(2)} mSv). Check the mission day.`;
					value = void 0;
				}
			}
		}
		if (Object.keys(errors).length > 0 || value === void 0) return {
			ok: false,
			errors: Object.keys(errors).length ? errors : { value: "Enter a valid value." }
		};
		return {
			ok: true,
			value,
			missionDay: dayNum,
			recordedAt: missionDayToIso(dayNum, minutes ?? 0),
			...notes ? { notes } : {},
			...draft.metricId === "bloodGlucose" ? { glucoseContext: draft.glucoseContext } : {}
		};
	}
	function isSymptoms(x) {
		return isRecord$1(x) && typeof x.blurredVision === "boolean" && typeof x.headache === "boolean" && typeof x.eyePressure === "boolean" && typeof x.otherSymptom === "boolean";
	}
	function isValueFor(metricId, v) {
		if (metricId === "bloodPressure") return isRecord$1(v) && isFiniteNumber(v.systolic) && isFiniteNumber(v.diastolic);
		if (metricId === "symptoms") return isSymptoms(v);
		return isFiniteNumber(v);
	}
	function sanitizeMeasurement(x) {
		if (!isRecord$1(x)) return null;
		if (typeof x.id !== "string" || !isMetricId(x.metricId) || !isMissionDay(x.missionDay) || !isIsoDate(x.recordedAt)) return null;
		if (!isValueFor(x.metricId, x.value)) return null;
		const notes = typeof x.notes === "string" && x.notes.length <= 280 ? x.notes : void 0;
		const legacyTuesday = x.source === "manual" && notes === "Voice telemetry via Tuesday AI";
		if (x.source !== "manual" && x.source !== "tuesday" && x.source !== "import" && x.source !== "device" && x.source !== "device-sim") return null;
		const out = {
			id: x.id,
			metricId: x.metricId,
			value: x.value,
			unit: typeof x.unit === "string" ? x.unit : METRIC_UNITS[x.metricId],
			missionDay: x.missionDay,
			recordedAt: x.recordedAt,
			source: legacyTuesday ? "tuesday" : x.source
		};
		if (notes) out.notes = notes;
		if (isIsoDate(x.enteredAt)) out.enteredAt = x.enteredAt;
		if (x.glucoseContext === "fasting" || x.glucoseContext === "post-meal" || x.glucoseContext === "other") out.glucoseContext = x.glucoseContext;
		return out;
	}
	function sanitizeMeasurements(x) {
		if (!Array.isArray(x)) return null;
		return x.map(sanitizeMeasurement).filter((m) => m !== null).slice(-5e3);
	}
	function sanitizeCompletions(x) {
		if (!isRecord$1(x)) return null;
		const out = {};
		for (const [dayKey, tasks] of Object.entries(x)) {
			const day = Number(dayKey);
			if (!isMissionDay(day) || !isRecord$1(tasks)) continue;
			for (const [taskId, rec] of Object.entries(tasks)) {
				if (!isRecord$1(rec) || typeof rec.completed !== "boolean") continue;
				const via = rec.via === "checkbox" || rec.via === "measurement" ? rec.via : "checkbox";
				const record = {
					taskId,
					missionDay: day,
					completed: rec.completed,
					via
				};
				if (rec.completed && isIsoDate(rec.completedAt)) record.completedAt = rec.completedAt;
				(out[day] ?? (out[day] = {}))[taskId] = record;
			}
		}
		return out;
	}
	function sanitizeFollowUps(x) {
		if (!isRecord$1(x)) return null;
		const out = {};
		for (const [dayKey, items] of Object.entries(x)) {
			const day = Number(dayKey);
			if (!isMissionDay(day) || !isRecord$1(items)) continue;
			for (const [id, at] of Object.entries(items)) if (isIsoDate(at)) (out[day] ?? (out[day] = {}))[id] = at;
		}
		return out;
	}
	/** PVT band: both ends inside the slider bounds and at least 10 ms apart, else the defaults. */
	function pvtBand(lo, hi, defaults) {
		const ok = (v) => isFiniteNumber(v) && v >= PVT.sliderBounds.min && v <= PVT.sliderBounds.max;
		if (ok(lo) && ok(hi) && hi - lo >= 10) return {
			pvtMinMs: Math.round(lo),
			pvtMaxMs: Math.round(hi)
		};
		return {
			pvtMinMs: defaults.pvtMinMs,
			pvtMaxMs: defaults.pvtMaxMs
		};
	}
	function sanitizeSettings(x, defaults) {
		if (!isRecord$1(x)) return null;
		return {
			scenarioId: isScenarioId(x.scenarioId) ? x.scenarioId : defaults.scenarioId,
			selectedDay: isMissionDay(x.selectedDay) ? x.selectedDay : defaults.selectedDay,
			aredTargetMinutes: Number.isInteger(x.aredTargetMinutes) && x.aredTargetMinutes >= 10 && x.aredTargetMinutes <= 180 ? x.aredTargetMinutes : defaults.aredTargetMinutes,
			hydrationTargetLiters: isFiniteNumber(x.hydrationTargetLiters) && x.hydrationTargetLiters >= .5 && x.hydrationTargetLiters <= 5 ? Math.round(x.hydrationTargetLiters * 10) / 10 : defaults.hydrationTargetLiters,
			...pvtBand(x.pvtMinMs, x.pvtMaxMs, defaults),
			radiationLimitMsv: isFiniteNumber(x.radiationLimitMsv) && x.radiationLimitMsv >= RADIATION.limit.min && x.radiationLimitMsv <= RADIATION.limit.max ? Math.round(x.radiationLimitMsv) : defaults.radiationLimitMsv,
			trendWindow: TREND_WINDOWS.includes(x.trendWindow) ? x.trendWindow : defaults.trendWindow,
			trendTab: TREND_TABS.includes(x.trendTab) ? x.trendTab : defaults.trendTab
		};
	}
	// src/services/nasaDonkiApi.ts
	var DONKI_TYPES = [
		"FLR",
		"SEP",
		"CME",
		"NOTIFICATION"
	];
	var str = (x, max = 400) => typeof x === "string" && x.trim() !== "" ? x.trim().slice(0, max) : void 0;
	var numOrStr = (x) => typeof x === "number" && Number.isFinite(x) ? String(x) : str(x, 40);
	var ALLOWED_LINK_HOSTS = /* @__PURE__ */ new Set([
		"ccmc.gsfc.nasa.gov",
		"kauai.ccmc.gsfc.nasa.gov",
		"api.nasa.gov",
		"www.nasa.gov",
		"nasa.gov",
		"iswa.gsfc.nasa.gov"
	]);
	/** Only https links to known NASA hosts are rendered. */
	function safeLink(x) {
		const s = str(x, 300);
		if (!s) return void 0;
		try {
			const u = new URL(s);
			if (u.protocol !== "https:") return void 0;
			const host = u.hostname === "kauai.ccmc.gsfc.nasa.gov" ? "ccmc.gsfc.nasa.gov" : u.hostname;
			if (!ALLOWED_LINK_HOSTS.has(u.hostname)) return void 0;
			u.hostname = host;
			return u.toString();
		} catch {
			return;
		}
	}
	/** DONKI times look like 2024-05-09T13:59Z. Normalise to full ISO, or drop. */
	function time(x) {
		const s = str(x, 40);
		if (!s) return void 0;
		const t = Date.parse(s);
		return Number.isNaN(t) ? void 0 : new Date(t).toISOString();
	}
	function linkedIds(x) {
		if (!Array.isArray(x)) return [];
		return x.map((l) => isRecord$1(l) ? str(l.activityID, 60) : void 0).filter((v) => Boolean(v)).slice(0, 12);
	}
	function instruments(x) {
		if (!Array.isArray(x)) return void 0;
		const names = x.map((i) => isRecord$1(i) ? str(i.displayName, 80) : void 0).filter(Boolean);
		return names.length ? names.slice(0, 4).join(", ") : void 0;
	}
	function details(pairs) {
		return pairs.filter((p) => Boolean(p[1])).map(([label, value]) => ({
			label,
			value
		}));
	}
	var NOTIFICATION_LABELS = {
		FLR: "Solar flare",
		SEP: "Solar energetic particle",
		CME: "Coronal mass ejection",
		GST: "Geomagnetic storm",
		IPS: "Interplanetary shock",
		MPC: "Magnetopause crossing",
		RBE: "Radiation belt enhancement",
		HSS: "High speed stream",
		Report: "Space weather report"
	};
	function notificationSummary(body) {
		const s = typeof body === "string" ? body : "";
		const m = s.match(/## Summary:\s*([\s\S]*?)(\n## |$)/);
		return (m ? m[1] : s).replace(/[#*`]/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
	}
	function normalizeFlr(raw, dataSource) {
		if (!isRecord$1(raw)) return null;
		const id = str(raw.flrID, 80);
		if (!id) return null;
		const cls = str(raw.classType, 10);
		const startTime = time(raw.beginTime);
		const peakTime = time(raw.peakTime);
		const endTime = time(raw.endTime);
		return {
			id,
			type: "FLR",
			title: cls ? `Solar flare ${cls}` : "Solar flare",
			...startTime ? { startTime } : {},
			...peakTime ? { peakTime } : {},
			...endTime ? { endTime } : {},
			...cls ? { severity: `Class ${cls}` } : {},
			description: `A solar flare${cls ? ` of class ${cls}` : ""}${str(raw.sourceLocation, 20) ? ` from ${str(raw.sourceLocation, 20)}` : ""}${numOrStr(raw.activeRegionNum) ? ` (active region ${numOrStr(raw.activeRegionNum)})` : ""}. Flare class describes X-ray brightness, not a radiation dose.`,
			...safeLink(raw.link) ? { sourceUrl: safeLink(raw.link) } : {},
			dataSource,
			details: details([
				["Peak", peakTime],
				["Source location", str(raw.sourceLocation, 20)],
				["Active region", numOrStr(raw.activeRegionNum)],
				["Instruments", instruments(raw.instruments)]
			]),
			linkedIds: linkedIds(raw.linkedEvents)
		};
	}
	function normalizeSep(raw, dataSource) {
		if (!isRecord$1(raw)) return null;
		const id = str(raw.sepID, 80);
		if (!id) return null;
		const startTime = time(raw.eventTime);
		return {
			id,
			type: "SEP",
			title: "Solar energetic particle event",
			...startTime ? { startTime } : {},
			description: "Elevated energetic particle flux detected near Earth. An SEP event is a radiation hazard indicator for crews; it is not a personal dose reading.",
			...safeLink(raw.link) ? { sourceUrl: safeLink(raw.link) } : {},
			dataSource,
			details: details([["Instruments", instruments(raw.instruments)]]),
			linkedIds: linkedIds(raw.linkedEvents)
		};
	}
	function normalizeCme(raw, dataSource) {
		if (!isRecord$1(raw)) return null;
		const id = str(raw.activityID, 80);
		if (!id) return null;
		const analyses = Array.isArray(raw.cmeAnalyses) ? raw.cmeAnalyses.filter(isRecord$1) : [];
		const best = analyses.find((a) => a.isMostAccurate === true) ?? analyses[0];
		const speed = best && typeof best.speed === "number" && Number.isFinite(best.speed) ? Math.round(best.speed) : void 0;
		const startTime = time(raw.startTime);
		const note = str(raw.note, 320);
		return {
			id,
			type: "CME",
			title: speed ? `Coronal mass ejection, ${speed.toLocaleString()} km/s` : "Coronal mass ejection",
			...startTime ? { startTime } : {},
			...best && str(best.type, 4) ? { severity: `Speed class ${str(best.type, 4)}` } : {},
			description: note ?? "A coronal mass ejection was observed. A CME does not by itself imply a specific radiation dose.",
			...safeLink(raw.link) ? { sourceUrl: safeLink(raw.link) } : {},
			dataSource,
			details: details([
				["Speed", speed ? `${speed.toLocaleString()} km/s` : void 0],
				["Speed class", best && str(best.type, 4) ? `${str(best.type, 4)} (DONKI SCORE scale: S < 500, C 500–999, O 1000–1999, R 2000–2999, ER ≥ 3000 km/s)` : void 0],
				["Half angle", best && typeof best.halfAngle === "number" ? `${best.halfAngle}°` : void 0],
				["Source location", str(raw.sourceLocation, 20)],
				["Active region", numOrStr(raw.activeRegionNum)]
			]),
			linkedIds: linkedIds(raw.linkedEvents)
		};
	}
	function normalizeNotification(raw, dataSource) {
		if (!isRecord$1(raw)) return null;
		const id = str(raw.messageID, 80);
		if (!id) return null;
		const type = str(raw.messageType, 20) ?? "Notice";
		const startTime = time(raw.messageIssueTime);
		return {
			id,
			type: "NOTIFICATION",
			title: `${NOTIFICATION_LABELS[type] ?? type} notification`,
			...startTime ? { startTime } : {},
			description: notificationSummary(raw.messageBody) || "DONKI notification. Open the source for the full message.",
			...safeLink(raw.messageURL) ? { sourceUrl: safeLink(raw.messageURL) } : {},
			dataSource,
			details: details([["Message type", type]]),
			linkedIds: []
		};
	}
	var NORMALIZERS = {
		FLR: normalizeFlr,
		SEP: normalizeSep,
		CME: normalizeCme,
		NOTIFICATION: normalizeNotification
	};
	function normalizeList(type, raw, dataSource) {
		if (!Array.isArray(raw)) return [];
		return raw.slice(0, 400).map((r) => NORMALIZERS[type](r, dataSource)).filter((e) => e !== null);
	}
	function sortEvents(events) {
		return events.toSorted((a, b) => Date.parse(b.startTime ?? "") - Date.parse(a.startTime ?? "") || a.id.localeCompare(b.id));
	}
	new Set(DONKI_TYPES);
	// src/data/fallbackDonki.ts
	/**
	* Bundled DONKI archive used when no live or cached data exists.
	*
	* Real historical DONKI records from 2024-05-08 to 2024-05-16 (the May 2024
	* solar storm period), retrieved from the NASA CCMC DONKI service and trimmed by
	* scripts/build-donki-fallback.mjs. Labelled ARCHIVED and never presented as
	* live or current conditions.
	*/
	var file = donki_fallback_default;
	file.provenance;
	var cached$1 = null;
	function getArchivedEventsByType() {
		if (!cached$1) cached$1 = {
			FLR: sortEvents(normalizeList("FLR", file.FLR, "archived")),
			SEP: sortEvents(normalizeList("SEP", file.SEP, "archived")),
			CME: sortEvents(normalizeList("CME", file.CME, "archived")),
			NOTIFICATION: sortEvents(normalizeList("NOTIFICATION", file.notifications, "archived"))
		};
		return cached$1;
	}
	function getArchivedEvents() {
		const t = getArchivedEventsByType();
		return sortEvents([
			...t.FLR,
			...t.SEP,
			...t.CME,
			...t.NOTIFICATION
		]);
	}
	// src/engine/retrieval.ts
	var STOP = new Set("a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so than that the their them then there these this to was we what when where which who why will with you your am been being did done get got just more most not now off out over own same should some such too up very".split(" "));
	/** Lower-case word tokens with light suffix stripping, so "readings" matches "reading". */
	function tokenize(text) {
		return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/(ings|ing|ies|ied|es|ed|s)$/, (m) => w.length - m.length >= 3 ? m === "ies" || m === "ied" ? "y" : "" : m));
	}
	function buildIndex(docs) {
		const tokens = docs.map((d) => tokenize(`${d.title} ${d.title} ${d.text}`));
		const df = /* @__PURE__ */ new Map();
		for (const t of tokens) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
		const avgLength = tokens.reduce((s, t) => s + t.length, 0) / Math.max(1, tokens.length);
		return {
			docs: [...docs],
			tokens,
			df,
			avgLength
		};
	}
	/** Okapi BM25 (k1 = 1.2, b = 0.75). Returns the top `k` passages with a positive score. */
	function retrieve(index, query, k = 4) {
		const q = [...new Set(tokenize(query))];
		if (!q.length) return [];
		const n = index.docs.length;
		const out = [];
		index.tokens.forEach((t, i) => {
			let score = 0;
			const counts = /* @__PURE__ */ new Map();
			for (const w of t) counts.set(w, (counts.get(w) ?? 0) + 1);
			for (const w of q) {
				const f = counts.get(w);
				if (!f) continue;
				const df = index.df.get(w) ?? 0;
				const idf = Math.log(1 + (n - df + .5) / (df + .5));
				score += idf * f * 2.2 / (f + 1.2 * (.25 + .75 * t.length / index.avgLength));
			}
			if (score > 0) out.push({
				doc: index.docs[i],
				score
			});
		});
		return out.sort((a, b) => b.score - a.score).slice(0, k);
	}
	// src/data/metricGuidance.ts
	var FITNESS_RISK = {
		label: "NASA HRP: Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness",
		url: "https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/"
	};
	var SLEEP_RISK = {
		label: "NASA HRP: Risk from Inadequate Sleep and Irregular Schedules",
		url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
	};
	var SANS_RISK = {
		label: "NASA HRP: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)",
		url: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"
	};
	var MSL_RAD = {
		label: "Zeitlin et al. 2013, Science 340:1080 (MSL/RAD cruise dose, about 1.8 mSv/day)",
		url: "https://doi.org/10.1126/science.1235989"
	};
	var GUIDANCE_DISCLAIMER = "Educational prototype content. These steps do not replace mission-approved procedures, device instructions or advice from qualified medical personnel.";
	var METRIC_GUIDANCE = {
		heartRate: {
			metricId: "heartRate",
			name: "Resting heart rate",
			shortName: "Heart rate",
			unit: "bpm",
			whatItMeasures: "How many times your heart beats per minute while you are at rest.",
			whyItMatters: "Resting heart rate is a simple daily signal of cardiovascular adaptation, recovery, hydration and stress.",
			deviceRequired: "Mission-approved heart-rate monitor or the pulse reading of the blood-pressure cuff.",
			howToMeasure: [
				"Measure at the same time each day, before exercise or caffeine where possible.",
				"Stabilize yourself in a seated or restrained position and rest for the protocol-defined period.",
				"Attach the sensor as the device instructions describe and stay still while it reads.",
				"Record the value. Repeat once if the device reports an error or the number looks unexpected."
			],
			microgravityEffects: "Fluids shift toward the upper body and the cardiovascular system adapts over the first weeks. Exercise, stress, sleep loss, illness and medication timing also change the reading.",
			whenToRepeat: "Repeat after the rest period if the reading is outside the configured range, if the device flagged an error, or if you feel unwell.",
			whatToRecord: [
				"Value in bpm",
				"Time and posture",
				"Recent exercise or caffeine",
				"Any symptoms"
			],
			nextStep: "If a repeated reading stays outside the configured range, follow the mission-approved cardiovascular protocol and note it for the medical officer.",
			trendTab: "heartRate",
			system: "cardiovascular",
			reference: FITNESS_RISK
		},
		bloodPressure: {
			metricId: "bloodPressure",
			name: "Blood pressure",
			shortName: "Blood pressure",
			unit: "mmHg",
			whatItMeasures: "The pressure in your arteries when the heart beats (systolic) and between beats (diastolic).",
			whyItMatters: "Blood pressure shows how the cardiovascular system is coping with fluid redistribution and deconditioning.",
			deviceRequired: "Mission-approved automated blood-pressure cuff of the correct size.",
			howToMeasure: [
				"Secure the device and follow its instructions.",
				"Use the same posture and conditions as previous readings.",
				"Rest for the protocol-defined period before measuring.",
				"Position the cuff on the upper arm as instructed, at heart level, and stay still and quiet.",
				"Take the reading. Repeat if the device reports an error or the result is unexpected.",
				"Record both numbers, posture, time and any symptoms."
			],
			microgravityEffects: "Fluid shifts toward the head and changes in blood volume alter pressure readings. Restraint position, cuff placement and recent exercise change results too.",
			whenToRepeat: "Repeat once after rest if either number is outside the configured range or the device flags an error.",
			whatToRecord: [
				"Systolic and diastolic (mmHg)",
				"Posture and arm used",
				"Time",
				"Symptoms such as headache or dizziness"
			],
			nextStep: "If repeated readings stay outside the configured range, review the mission-approved cardiovascular protocol and record the readings for the flight surgeon.",
			trendTab: "bloodPressure",
			system: "cardiovascular",
			reference: FITNESS_RISK
		},
		bloodGlucose: {
			metricId: "bloodGlucose",
			name: "Blood glucose",
			shortName: "Glucose",
			unit: "mg/dL",
			whatItMeasures: "The amount of sugar in a small blood sample.",
			whyItMatters: "Glucose reflects how the body is handling food, sleep, activity and stress, which all change on long missions.",
			deviceRequired: "Mission-approved glucometer, test strips and lancet.",
			howToMeasure: [
				"Confirm the glucometer, strips and lancet are the approved supplies and in date.",
				"Follow the device instructions and the mission timing protocol (for example fasting or after a meal).",
				"Clean the sampling site, take the sample and apply it to the strip as instructed.",
				"Record the value and whether it was fasting, post-meal or other."
			],
			microgravityEffects: "Altered sleep, meal timing, reduced loading and stress can change glucose. The reading only makes sense with its timing context.",
			whenToRepeat: "Repeat at the next protocol time point, or sooner if the value is outside the configured range or the strip shows an error.",
			whatToRecord: [
				"Value in mg/dL",
				"Fasting, post-meal or other",
				"Time of last meal",
				"Any symptoms"
			],
			nextStep: "Follow the mission-approved protocol for unusual results and note the timing context.",
			trendTab: "bloodGlucose",
			system: "metabolicCircadian",
			reference: null
		},
		bodyTemperature: {
			metricId: "bodyTemperature",
			name: "Body temperature",
			shortName: "Temperature",
			unit: "°C",
			whatItMeasures: "Your body temperature at the measurement site used by the mission thermometer.",
			whyItMatters: "A raised temperature can be an early sign of illness. Spacecraft cabins make heat loss slightly different from Earth.",
			deviceRequired: "Mission-approved thermometer.",
			howToMeasure: [
				"Use the approved thermometer and the same measurement site each time.",
				"Avoid measuring straight after exercise or a warm drink.",
				"Follow the device instructions for placement and reading time.",
				"Record the value and the site used."
			],
			microgravityEffects: "Without convection, heat leaves the body more slowly. Exercise and cabin temperature change readings.",
			whenToRepeat: "Repeat after 30 minutes at rest if the value is outside the configured range.",
			whatToRecord: [
				"Value in °C",
				"Measurement site",
				"Recent exercise",
				"Symptoms such as chills or fatigue"
			],
			nextStep: "If a repeated reading stays outside the configured range, record symptoms and follow the mission-approved illness protocol.",
			trendTab: "bodyTemperature",
			system: "metabolicCircadian",
			reference: null
		},
		sleep: {
			metricId: "sleep",
			name: "Daily sleep",
			shortName: "Sleep",
			unit: "h",
			whatItMeasures: "How long you slept in your last sleep period.",
			whyItMatters: "Short sleep across several days can reduce attention and reaction time, which matters for safety-critical work.",
			deviceRequired: "Sleep log entry, or an approved actigraphy device where the mission provides one.",
			howToMeasure: [
				"Note the time you went to sleep and the time you woke.",
				"Subtract any long awakenings you remember.",
				"Enter the total in hours, using the same method each day."
			],
			microgravityEffects: "Light-dark cycles, noise, schedule shifts and workload all disrupt sleep timing on a spacecraft.",
			whenToRepeat: "Log once per sleep period.",
			whatToRecord: [
				"Total hours",
				"Sleep and wake times",
				"Disturbances",
				"Use of any approved sleep aid"
			],
			nextStep: "If sleep stays short for consecutive days, review the approved sleep routine and the schedule with the medical officer.",
			trendTab: "sleepMood",
			system: "neuroOcular",
			reference: SLEEP_RISK
		},
		mood: {
			metricId: "mood",
			name: "Mood check-in",
			shortName: "Mood",
			unit: "/ 5",
			whatItMeasures: "A self-rated score from 1 (very low) to 5 (very good) using the same scale each day.",
			whyItMatters: "Isolation, confinement and workload affect wellbeing. A persistent change is more meaningful than one low day.",
			deviceRequired: "None. Use the mission's standard self-report scale.",
			howToMeasure: [
				"Rate your overall mood for the day on the 1–5 scale.",
				"Use the same time of day and the same scale every day.",
				"Add a short note if something specific affected it."
			],
			microgravityEffects: "Confinement, distance from home, sleep loss and workload can lower mood over a long mission.",
			whenToRepeat: "Once per day.",
			whatToRecord: ["Score 1–5", "Optional note"],
			nextStep: "If scores stay low for several days, use the mission's approved behavioural-health resources and talk with the medical officer when communication is available.",
			trendTab: "sleepMood",
			system: "metabolicCircadian",
			reference: SLEEP_RISK
		},
		aredMinutes: {
			metricId: "aredMinutes",
			name: "Strength exercise (ARED)",
			shortName: "Strength exercise",
			unit: "min",
			whatItMeasures: "Minutes of resistive exercise completed on the Advanced Resistive Exercise Device (ARED) today.",
			whyItMatters: "Reduced mechanical loading contributes to bone and muscle loss. Resistive exercise is a key countermeasure. Minutes show adherence; they do not measure bone density.",
			deviceRequired: "ARED or the mission's approved resistive exercise device.",
			howToMeasure: [
				"Review the scheduled exercise plan for today.",
				"Inspect the equipment and confirm it is ready.",
				"Complete only the assigned session.",
				"Record completed minutes and any equipment problem or discomfort."
			],
			microgravityEffects: "Without gravity, bones and muscles carry less load. Equipment availability and schedule changes affect sessions.",
			whenToRepeat: "Log after each session.",
			whatToRecord: [
				"Minutes completed",
				"Exercises completed",
				"Equipment issues",
				"Discomfort"
			],
			nextStep: "Do not increase intensity or duration based on this app. Follow the approved exercise plan and report missed sessions.",
			trendTab: "ared",
			system: "musculoskeletal",
			reference: FITNESS_RISK
		},
		radiation: {
			metricId: "radiation",
			name: "Cumulative radiation dose",
			shortName: "Radiation dose",
			unit: "mSv",
			whatItMeasures: "Your personal dosimeter's cumulative dose for the mission, and the change since the previous day.",
			whyItMatters: "Exposure accumulates over the mission. Only a dosimeter or a validated mission model gives a personal dose value.",
			deviceRequired: "Personal dosimeter assigned by the mission.",
			howToMeasure: [
				"Review the current dosimeter reading and its timestamp.",
				"Confirm the reading is current and from your assigned device.",
				"Enter the cumulative value exactly as displayed."
			],
			microgravityEffects: "Outside Earth's magnetosphere, galactic cosmic rays give a steady dose and solar particle events can add more. Shielding and location in the vehicle change exposure.",
			whenToRepeat: "Once per day, and during any space-weather alert as the mission procedure directs.",
			whatToRecord: [
				"Cumulative mSv",
				"Device ID",
				"Location in the vehicle",
				"Any shelter actions taken"
			],
			nextStep: "Review the space-weather status. Follow the approved radiation protection and shelter procedure when directed.",
			trendTab: "radiation",
			system: "immuneRadiation",
			reference: MSL_RAD
		},
		pvt: {
			metricId: "pvt",
			name: "PVT reaction time",
			shortName: "Reaction test",
			unit: "ms",
			whatItMeasures: "Mean reaction time on the Psychomotor Vigilance Test, a short task where you respond to a light or signal.",
			whyItMatters: "Slower reaction time can reveal fatigue from sleep loss or workload before you notice it.",
			deviceRequired: "Mission-approved PVT application or device.",
			howToMeasure: [
				"Choose a quiet moment and stabilize yourself.",
				"Run the scheduled PVT session to completion without interruptions.",
				"Record the mean reaction time the device reports."
			],
			microgravityEffects: "Sleep disruption, circadian shifts and workload can slow reaction time.",
			whenToRepeat: "At the scheduled interval (every third day in this demo plan).",
			whatToRecord: [
				"Mean reaction time (ms)",
				"Lapses if reported",
				"Time of day"
			],
			nextStep: "If reaction time stays slower than your baseline, review sleep and workload with the medical officer.",
			trendTab: "pvtHydration",
			system: "neuroOcular",
			reference: SLEEP_RISK
		},
		hydration: {
			metricId: "hydration",
			name: "Hydration",
			shortName: "Hydration",
			unit: "L",
			whatItMeasures: "Total fluid you drank today.",
			whyItMatters: "Fluid intake supports cardiovascular adaptation, kidney health and temperature control.",
			deviceRequired: "Drink-bag volume markings or the mission's fluid log.",
			howToMeasure: ["Add up the volume of each drink bag or container you finished.", "Enter the total in litres at the end of the day."],
			microgravityEffects: "Thirst is weaker in microgravity, so intake can fall without you noticing.",
			whenToRepeat: "Once per day.",
			whatToRecord: ["Total litres", "Anything unusual such as illness"],
			nextStep: "If intake stays below the mission plan, review the hydration plan.",
			trendTab: "pvtHydration",
			system: "metabolicCircadian",
			reference: null
		},
		symptoms: {
			metricId: "symptoms",
			name: "Neuro-ocular symptom check",
			shortName: "Vision check",
			unit: "",
			whatItMeasures: "Whether you notice blurred vision, eye pressure, headache or another new symptom.",
			whyItMatters: "Fluid shifts toward the head can affect the eyes and vision. New or worsening symptoms need recording and review. This check cannot diagnose SANS.",
			deviceRequired: "The mission's vision-check card or approved vision device.",
			howToMeasure: [
				"Sit or stabilize yourself in a safe position.",
				"Use the supplied vision-check card or approved mission device.",
				"Test each eye separately if the protocol calls for it.",
				"Record blurred vision, pressure sensation, headache or other symptoms.",
				"Compare with prior checks and follow the mission protocol if symptoms are new or worsening."
			],
			microgravityEffects: "Headward fluid shift can change ocular structures over long missions.",
			whenToRepeat: "At the scheduled interval (weekly in this demo plan) and whenever symptoms change.",
			whatToRecord: [
				"Each symptom reported",
				"Which eye",
				"When it started"
			],
			nextStep: "If a symptom is new or worsening, follow the mission protocol and note it for the medical officer.",
			trendTab: null,
			system: "neuroOcular",
			reference: SANS_RISK
		}
	};
	// src/data/scenarioHazards.ts
	var SEP_SCENARIO = {
		id: "sep-sim",
		title: "Simulated solar particle event",
		eventDays: [131, 133],
		phases: {
			130: {
				level: "WATCH",
				phase: "Precursor",
				description: "Simulated large solar flare reported by the mission's space-weather support. Energetic particles may arrive within hours."
			},
			131: {
				level: "WARNING",
				phase: "Onset and peak",
				description: "Simulated particle flux rises sharply and peaks. Shelter procedure in effect."
			},
			132: {
				level: "WARNING",
				phase: "Elevated, declining",
				description: "Simulated flux remains elevated but is falling. Shelter use continues as directed."
			},
			133: {
				level: "WATCH",
				phase: "Tail",
				description: "Simulated flux approaches background. Shelter may be released when the procedure allows."
			},
			134: {
				level: "ALL CLEAR",
				phase: "Post-event review",
				description: "Simulated event over. Record readings and actions for the flight surgeon."
			}
		},
		dosimeterOverlayMsv: {
			131: 6.4,
			132: 2.8,
			133: .9
		},
		sleepOverrideHours: {
			131: 5.2,
			132: 5.6
		}
	};
	/** How an SEP relates to each physiological system. */
	var SEP_SYSTEM_RELATIONS = [
		{
			id: "immuneRadiation",
			relation: "Direct",
			text: "Added radiation exposure risk. Only the dosimeter measures personal dose; the hazard level is not a dose.",
			indicators: ["radiation"]
		},
		{
			id: "neuroOcular",
			relation: "Indirect",
			text: "Alarms and time in shelter cut sleep, which can slow reaction time and attention.",
			indicators: ["sleep", "pvt"]
		},
		{
			id: "metabolicCircadian",
			relation: "Indirect",
			text: "Meals, fluids and the light-dark schedule shift while sheltering.",
			indicators: [
				"hydration",
				"sleep",
				"mood"
			]
		},
		{
			id: "musculoskeletal",
			relation: "Operational",
			text: "Exercise sessions may be deferred while sheltering. Log them; do not make them up later.",
			indicators: ["aredMinutes"]
		}
	];
	var SHELTER_REFERENCE = {
		label: "NASA: Scientists and Engineers Evaluate Orion Radiation Protection Plan",
		url: "https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/"
	};
	var ARTEMIS_SPACE_WEATHER_REFERENCE = {
		label: "NASA Science: To Protect Artemis II Astronauts, NASA Experts Keep Eyes on Sun",
		url: "https://science.nasa.gov/missions/artemis/artemis-2/to-protect-artemis-ii-astronauts-nasa-experts-keep-eyes-on-sun/"
	};
	// src/data/sources.ts
	var REFERENCE_SOURCES = [
		{
			title: "5 Hazards of Human Spaceflight",
			url: "https://www.nasa.gov/hrp/hazards/",
			publisher: "NASA Human Research Program",
			description: "Space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments, and how they can feed off one another.",
			usedFor: "Organises the five body systems and features by hazard (Overview and system panel). The mapping is ASTRA-MED's own."
		},
		{
			title: "Risks of Human Spaceflight",
			url: "https://www.nasa.gov/hrp/risks/",
			publisher: "NASA Human Research Program",
			description: "Index of HRP's human health and performance risks linked to the five hazards.",
			usedFor: "Entry point for the risk pages cited with individual recommendations."
		},
		{
			title: "Monitoring radiation for astronaut health",
			url: "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
			publisher: "Canadian Space Agency (CSA), 2026-02-26",
			description: "CSA's Canadian Active Neutron Spectrometer (CANS), a compact instrument that measures neutron exposure continuously and autonomously. Neutrons make up about 30% of the total radiation on the ISS.",
			usedFor: "Context for why personal exposure comes from on-board dosimetry, not from space-weather alerts (space-weather monitor)."
		},
		{
			title: "How does radiation affect the human body in space?",
			url: "https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp",
			publisher: "Canadian Space Agency (CSA)",
			description: "Galactic cosmic rays, solar particle events and trapped radiation; acute effects are not expected except in a large solar particle event.",
			usedFor: "Why Scenario C treats a solar particle event as the case that needs shelter."
		},
		{
			title: "Why do we conduct science experiments in space?",
			url: "https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp",
			publisher: "Canadian Space Agency (CSA)",
			description: "Moon and Mars missions bring more weightlessness, radiation, isolation and communication delay, and less ability to rely on Earth; ISS research characterises these risks and countermeasures.",
			usedFor: "Framing for on-board self-assessment and the ship-to-Earth signal delay (Overview)."
		},
		{
			title: "DONKI WSA-ENLIL Simulations",
			url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
			publisher: "NASA Community Coordinated Modeling Center (CCMC)",
			description: "DONKI catalogues CCMC's WSA-ENLIL heliospheric model runs for coronal mass ejections. Each run lists predicted arrival times at Earth and at planets and spacecraft, including Mars.",
			usedFor: "The Earth and Mars CME arrival forecast in the space-weather monitor and the CME notice in the status band. Forecast only; never a dose or a health status."
		},
		{
			title: "Approximate Positions of the Planets (Keplerian elements)",
			url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
			publisher: "NASA JPL Solar System Dynamics (E. M. Standish)",
			description: "Keplerian elements and rates for approximate planet positions, valid 1800–2050.",
			usedFor: "Earth–Mars distance on each mission date, computed in the browser. The ship's signal delay is a growing share of it, from launch to arrival at Mars."
		},
		{
			title: "Spaceflight Standard Measures",
			url: "https://nlsp.nasa.gov/resources/standard-measures",
			publisher: "NASA Human Research Program, NASA Life Sciences Portal",
			description: "HRP's set of standard measurements collected across spaceflight studies, hosted on the NASA Life Sciences Portal.",
			usedFor: "Context for which kinds of measures are tracked. Not used to set any threshold."
		},
		{
			title: "NASA Life Sciences Portal",
			url: "https://www.nasa.gov/hrp/nlsp/",
			publisher: "NASA Human Research Program",
			description: "Portal for human research data from spaceflight and ground-analog studies back to 1961. Its open-access datasets include head-down-tilt bed-rest campaigns run at the University of Texas Medical Branch (UTMB Bedrest Campaigns 1 and 3, and a 70-day bed-rest exercise and performance study).",
			usedFor: "Research context and the UTMB bed-rest dataset listing. ASTRA-MED does not use bed-rest data in its rules."
		},
		{
			title: "NASA Open Science Data Repository (OSDR / GeneLab / ALSDA)",
			url: "https://osdr.nasa.gov/bio/repo",
			publisher: "NASA",
			description: "Open repository of space biology and life-science study data and metadata.",
			usedFor: "Research review. See the study notes below."
		},
		{
			title: "NASA-STD-3001 Vol. 2, §4.0 Physical Characteristics and Capabilities",
			url: "https://www.nasa.gov/reference/4-0-physical-characteristics-and-capabilities-vol-2/",
			publisher: "NASA Human Integration Design Handbook",
			description: "Design reference for crew body dimensions, range of motion, mass, strength and aerobic capacity.",
			usedFor: "Human-factors context only."
		},
		{
			title: "NASA Open APIs and DONKI",
			url: "https://api.nasa.gov/",
			publisher: "NASA",
			description: "NASA's public API gateway. DONKI (Space Weather Database Of Notifications, Knowledge, Information) is run by the Community Coordinated Modeling Center and catalogues flares, SEP events, CMEs and notifications.",
			usedFor: "Live, cached and bundled space-weather events. Environmental context only."
		},
		{
			title: "CCMC DONKI system",
			url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
			publisher: "NASA Community Coordinated Modeling Center",
			description: "The DONKI home, including the machine-readable catalogue of FLR, SEP and CME events and notifications.",
			usedFor: "Per-endpoint fallback host and the archived offline sample (2024-05-08 to 2024-05-16)."
		},
		{
			title: "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)",
			url: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
			publisher: "NASA Human Research Program",
			description: "NASA's summary of the SANS risk and why it needs monitoring.",
			usedFor: "Context for the neuro-ocular body-system text."
		},
		{
			title: "Risk from Inadequate Sleep and Irregular Schedules",
			url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
			publisher: "NASA Human Research Program",
			description: "NASA's summary of performance and health risks from sleep loss, circadian desynchronisation and work overload.",
			usedFor: "Context for sleep, PVT and circadian guidance."
		},
		{
			title: "Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness",
			url: "https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/",
			publisher: "NASA Human Research Program",
			description: "NASA's summary of fitness loss in spaceflight and the role of exercise countermeasures.",
			usedFor: "Context for musculoskeletal and cardiovascular text."
		},
		{
			title: "Zeitlin et al. (2013), Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory",
			url: "https://doi.org/10.1126/science.1235989",
			publisher: "Science 340 (6136): 1080–1084",
			description: "Radiation measured by the RAD instrument inside the MSL spacecraft during its cruise to Mars.",
			usedFor: "Only to choose a plausible order of magnitude for the synthetic daily dose. No dose value in ASTRA-MED is a measurement."
		},
		{
			title: "Data from NASA rover's voyage to Mars aids planning",
			url: "https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/",
			publisher: "NASA Jet Propulsion Laboratory",
			description: "JPL summary of the RAD cruise result: an average galactic cosmic ray dose-equivalent rate of about 1.8 mSv per day inside the spacecraft, during low to moderate solar activity.",
			usedFor: "Cross-check for the synthetic dosimeter level (about 1.8 mSv/day, about 324 mSv over 180 days)."
		},
		{
			title: "Risk of Behavioral Conditions and Psychiatric Disorders",
			url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/",
			publisher: "NASA Human Research Program",
			description: "Isolation and confinement can raise the risk of behavioural problems such as anxiety and depression; spacecraft windows and reminders of Earth can help reduce monotony.",
			usedFor: "Tuesday's wellbeing guidance and the reason the Recharge deck opens on an Earth view."
		},
		{
			title: "Global Imagery Browse Services (GIBS)",
			url: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api",
			publisher: "NASA Earthdata",
			description: "Daily global satellite imagery served as map layers. ASTRA-MED uses MODIS Terra corrected-reflectance true colour, Blue Marble Next Generation and VIIRS city lights.",
			usedFor: "The Earth globe in Tuesday's Recharge deck: yesterday's real clouds, lit for the real Sun position now."
		},
		{
			title: "EPIC: Earth Polychromatic Imaging Camera",
			url: "https://epic.gsfc.nasa.gov/about",
			publisher: "NASA Goddard / NOAA DSCOVR",
			description: "Full-disc photos of the sunlit Earth from the Sun–Earth L1 point, about 1.5 million km away, published several times a day.",
			usedFor: "The latest whole-Earth photo beside the globe."
		},
		{
			title: "Isolation Forest (Liu, Ting and Zhou, 2008)",
			url: "https://doi.org/10.1109/ICDM.2008.17",
			publisher: "IEEE International Conference on Data Mining",
			description: "Anomaly detection that isolates unusual points with random splits; unusual points need fewer splits.",
			usedFor: "Baseline drift: scores recent days against the crew member's own earlier days. A cue, never a status."
		}
	];
	// src/data/spaceflightHazards.ts
	var HRP_HAZARDS_URL = "https://www.nasa.gov/hrp/hazards/";
	var SPACEFLIGHT_HAZARDS = [
		{
			id: "radiation",
			name: "Space radiation",
			summary: "Invisible and considered one of the most hazardous parts of spaceflight, especially beyond Earth's magnetic field.",
			systems: ["immuneRadiation"],
			inApp: "Dosimeter dose, NASA DONKI space weather, solar storm forecasts for Earth and Mars, and a shelter sequence for particle events."
		},
		{
			id: "isolation",
			name: "Isolation and confinement",
			summary: "Small groups living far from Earth in a small space for a long time show behavioural responses.",
			systems: ["metabolicCircadian", "neuroOcular"],
			inApp: "Daily mood, sleep and a reaction-time check, with trend watch for gradual decline."
		},
		{
			id: "distance",
			name: "Distance from Earth",
			summary: "Instructions, supplies and medical care become harder to receive as crews travel deeper into space.",
			systems: [
				"cardiovascular",
				"musculoskeletal",
				"neuroOcular",
				"immuneRadiation",
				"metabolicCircadian"
			],
			inApp: "Works fully offline, shows the ship-to-Earth signal delay for the mission day, and gives on-board guidance and a report for the flight surgeon."
		},
		{
			id: "gravity",
			name: "Gravity fields",
			summary: "Muscles, bones, the inner ear and organs must adjust to weightlessness and to each new gravity field.",
			systems: [
				"cardiovascular",
				"musculoskeletal",
				"neuroOcular"
			],
			inApp: "Heart rate, blood pressure, vision symptoms and resistive exercise (ARED) with daily countermeasures."
		},
		{
			id: "environment",
			name: "Hostile and closed environments",
			summary: "Keeping a safe ecosystem on board means controlling temperature, pressure, lighting and noise, watching microbes and tracking immune responses.",
			systems: ["metabolicCircadian", "immuneRadiation"],
			inApp: "Body temperature, blood glucose, hydration and a light-and-sleep routine."
		}
	];
	// src/data/wellbeingGuides.ts
	var BEHAVIORAL_RISK = {
		label: "NASA HRP: Risk of Behavioral Conditions and Psychiatric Disorders",
		url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/"
	};
	var WELLBEING_GUIDES = [
		{
			id: "isolation",
			title: "Isolation and confinement",
			text: "Long isolation and confinement can raise the risk of behavioural problems such as anxiety and low mood. Deep-space crews also lose quick contact with family and support on Earth because of the signal delay. Noticing changes early and keeping routines helps.",
			source: BEHAVIORAL_RISK
		},
		{
			id: "windows",
			title: "Looking at Earth",
			text: "NASA notes that spacecraft windows can support crew mental health by reducing monotony and the feeling of confinement. Reminders of Earth, such as growing fresh plants, may also help. Tuesday's Earth view shows NASA imagery of Earth from the previous day.",
			source: BEHAVIORAL_RISK
		},
		{
			id: "boredom",
			title: "Boredom and monotony",
			text: "Monotony is a known stressor on long missions. Short changes of activity help: a few minutes looking at Earth, a light game, a paced-breathing round, or a message recorded for family to send at the next communication window.",
			source: BEHAVIORAL_RISK
		},
		{
			id: "fatigue",
			title: "Feeling tired",
			text: "Tiredness can come from short or broken sleep, a shifted schedule, heavy workload or illness. Log your sleep the same way each day, keep the planned sleep period, and avoid starting safety-critical work while very tired. If tiredness continues, note it for the medical officer.",
			source: {
				label: "NASA HRP: Risk from Inadequate Sleep and Irregular Schedules",
				url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
			}
		},
		{
			id: "breathing",
			title: "Paced breathing",
			text: "A slow paced-breathing round (about six breaths a minute: breathe in for 4 seconds, out for 6) is a simple way to slow down for a few minutes. It is a relaxation exercise, not a treatment.",
			source: null
		},
		{
			id: "crew",
			title: "Crew and teamwork",
			text: "Small crews living close together for a long time need good communication and conflict handling. Talk early with a crewmate or the behavioural-health contact when something feels wrong.",
			source: {
				label: "NASA HRP: Risk of Inadequate Teamwork",
				url: "https://www.nasa.gov/reference/risk-of-inadequate-teamwork/"
			}
		},
		{
			id: "support",
			title: "When to ask for help",
			text: "If low mood, hopelessness, panic or thoughts of self-harm appear, tell a crewmate now and contact the medical officer or behavioural-health support at the next communication window, or sooner by the mission's urgent channel. Tuesday is not a counsellor.",
			source: BEHAVIORAL_RISK
		}
	];
	// src/data/knowledgeBase.ts
	/**
	* Everything Tuesday may quote, gathered from ASTRA-MED's existing guidance,
	* hazard, protective-step and wellbeing data. The text is the app's own
	* prototype content with its sources; none of it is an official NASA
	* checklist or ISS medical procedure.
	*/
	function guidanceDocs() {
		return ALL_METRIC_IDS.map((id) => {
			const g = METRIC_GUIDANCE[id];
			return {
				id: `guidance:${id}`,
				title: `${g.name}: how to measure and what to do`,
				kind: "guidance",
				source: g.reference,
				text: [
					g.whatItMeasures,
					g.whyItMatters,
					`Device: ${g.deviceRequired}`,
					`How to measure: ${g.howToMeasure.join(" ")}`,
					`In microgravity: ${g.microgravityEffects}`,
					`When to repeat: ${g.whenToRepeat}`,
					`Next step: ${g.nextStep}`
				].join(" ")
			};
		});
	}
	function hazardDocs() {
		return SPACEFLIGHT_HAZARDS.map((h) => ({
			id: `hazard:${h.id}`,
			title: `Spaceflight hazard: ${h.name}`,
			kind: "hazard",
			source: {
				label: "NASA HRP: 5 Hazards of Human Spaceflight",
				url: HRP_HAZARDS_URL
			},
			text: `${h.summary} In ASTRA-MED: ${h.inApp}`
		}));
	}
	function protocolDocs() {
		const tasks = getCountermeasureTasks(ARED.defaultTargetMinutes, HYDRATION.defaultTargetLiters).map((t) => ({
			id: `task:${t.id}`,
			title: `Countermeasure task: ${t.title}`,
			kind: "protocol",
			source: null,
			text: `${t.description} Target: ${t.targetLabel}. If missed: ${t.missedPrompt}`
		}));
		const sep = {
			id: "protocol:sep",
			title: "Solar particle event: protective sequence",
			kind: "protocol",
			source: SHELTER_REFERENCE,
			text: `During a solar particle event (solar storm) warning, here is what to do: move to the designated shelter location, record the dosimeter at shelter entry and exit, and defer non-essential work including ARED exercise. ${SEP_SYSTEM_RELATIONS.map((r) => r.text).join(" ")} Space weather is an environmental hazard; only the dosimeter measures personal dose.`
		};
		const escalation = {
			id: "protocol:escalation",
			title: "When a reading is outside the configured range",
			kind: "protocol",
			source: null,
			text: `Repeat the measurement with the same posture and rest period. If it stays outside the configured demonstration range, review the mission-approved protocol and contact the medical officer when communication is available. A CRITICAL status means contact the medical officer when communication is available. ${GUIDANCE_DISCLAIMER}`
		};
		return [
			...tasks,
			sep,
			escalation
		];
	}
	function wellbeingDocs() {
		return WELLBEING_GUIDES.map((w) => ({
			id: `wellbeing:${w.id}`,
			title: w.title,
			kind: "wellbeing",
			source: w.source,
			text: w.text
		}));
	}
	function sourceDocs() {
		return REFERENCE_SOURCES.map((s) => ({
			id: `source:${s.url}`,
			title: s.title,
			kind: "source",
			source: {
				label: `${s.publisher}: ${s.title}`,
				url: s.url
			},
			text: `${s.description} Used for: ${s.usedFor}`
		}));
	}
	function knowledgeDocs() {
		return [
			...guidanceDocs(),
			...hazardDocs(),
			...protocolDocs(),
			...wellbeingDocs(),
			...sourceDocs()
		];
	}
	var cached = null;
	function knowledgeIndex() {
		cached ?? (cached = buildIndex(knowledgeDocs()));
		return cached;
	}
	// src/data/medicalContact.ts
	/**
	* What to do first when a crew member needs the medical officer, with and
	* without a ground link. Prototype guidance in the mission's medical language;
	* the mission-approved onboard checklists always take precedence.
	*/
	var ONBOARD_FIRST = [
		"Tell the crew medical officer on board and keep a crewmate with you.",
		"Stop the current task. Stay still, seated or restrained.",
		"Follow the mission-approved onboard medical checklist for what you feel. ASTRA-MED gives no diagnosis or treatment."
	];
	var NO_LINK_STEPS = [
		"There is no ground link, so decisions are made on board until contact returns.",
		"Repeat your vital signs every 15 minutes and log each one. The console and this message update as you log.",
		"Write down when it started and anything that changes. Queue this message; hand it over at the next contact window.",
		"If you get worse, the crew medical officer leads, using the onboard checklists and medical kit."
	];
	var LINK_UP_NOTE = "Send this through the mission's messaging system. ASTRA-MED does not transmit anything; the answer takes at least twice the signal delay plus the medical officer's response time, so keep following the onboard steps meanwhile.";
	function basisFor(indicator, rule, provenance, reference, note) {
		return {
			indicator,
			rule,
			provenance,
			reference,
			referenceNote: note ?? (reference ? "Scientific context only. It explains why the indicator matters; it does not validate this threshold." : "No scientific source cited. Prototype assumption; configurable in src/config/thresholds.ts.")
		};
	}
	/** Basis for a metric recommendation: the first triggered rule, or routine monitoring when nominal. */
	function metricBasis(metricId, rules, notes = []) {
		const g = METRIC_GUIDANCE[metricId];
		const r = rules[0];
		if (r) return basisFor(g.name, `${r.description}: ${r.threshold}`, r.provenance, g.reference);
		if (notes[0]) return basisFor(g.name, `No rule triggered. ${notes[0]}`, "routine", g.reference);
		return basisFor(g.name, "Inside the configured demonstration range: routine monitoring", "routine", g.reference);
	}
	var SHELTER_NOTE = "Context: NASA describes sheltering behind stowage mass during SEP events for Orion crews. ASTRA-MED's wording is a prototype assumption, not a mission procedure.";
	function scenarioActions(level, day, phase) {
		const b = (ref, note) => basisFor("Environmental hazard assessment (scenario simulation)", `Level ${level} on mission day ${day} (${phase})`, "scenario-simulation", ref ? { ...ref } : null, note ?? "No scientific source cited. Prototype protective step defined in src/data/scenarioHazards.ts and src/engine/advisoryEngine.ts; follow the mission-approved procedure.");
		if (level === "WATCH") return [
			{
				id: "watch-procedure",
				text: "Review the mission-approved radiation procedure and confirm your designated shelter location.",
				systems: ["immuneRadiation"],
				basis: b(ARTEMIS_SPACE_WEATHER_REFERENCE, "Context: NASA monitors the Sun for Artemis crews and sets shelter triggers. ASTRA-MED's wording is a prototype assumption.")
			},
			{
				id: "watch-dosimeter",
				text: "Check that your personal dosimeter is worn, current and logging.",
				systems: ["immuneRadiation"],
				basis: b(null)
			},
			{
				id: "watch-monitor",
				text: "Keep monitoring space-weather alerts until the event is cleared.",
				systems: ["immuneRadiation"],
				basis: b(null)
			}
		];
		if (level === "WARNING") return [
			{
				id: "warn-shelter",
				text: "Move to the designated shelter location when the procedure directs, and arrange stowage mass as the procedure describes.",
				systems: ["immuneRadiation"],
				basis: b(SHELTER_REFERENCE, SHELTER_NOTE)
			},
			{
				id: "warn-dosimeter",
				text: "Check and record your dosimeter reading at shelter entry and exit.",
				systems: ["immuneRadiation"],
				basis: b(null)
			},
			{
				id: "warn-defer",
				text: "Defer non-essential work outside the shelter, including the ARED session, unless the procedure says otherwise. Log deferred sessions; do not make them up later.",
				systems: ["musculoskeletal"],
				basis: b(null)
			},
			{
				id: "warn-rest",
				text: "Log sleep and fluids during the shelter period; expect disrupted rest.",
				systems: ["neuroOcular", "metabolicCircadian"],
				basis: b(null)
			}
		];
		return [{
			id: "clear-record",
			text: "Record event start and end, shelter time and dosimeter readings for the flight surgeon.",
			systems: ["immuneRadiation"],
			basis: b(null)
		}, {
			id: "clear-resume",
			text: "Resume the normal schedule, including the next assigned ARED session at its normal duration.",
			systems: ["musculoskeletal"],
			basis: b(null)
		}];
	}
	function scenarioAdvisories(scenarioId, day) {
		if (scenarioId !== "sep") return [];
		const p = SEP_SCENARIO.phases[day];
		if (!p) return [];
		const [start, end] = SEP_SCENARIO.eventDays;
		return [{
			id: `scenario:${SEP_SCENARIO.id}:${day}`,
			source: "scenario",
			severity: p.level === "ALL CLEAR" ? "NOMINAL" : "CAUTION",
			level: p.level,
			phase: p.phase,
			title: `${SEP_SCENARIO.title}: ${p.level}`,
			summary: `${p.description} Environmental hazard indicator, not a personal dose.`,
			whyItMatters: "Solar particle events can add radiation exposure over hours to days. Protection depends on shelter location, shielding mass and the mission's approved procedure.",
			nextStep: scenarioActions(p.level, day, p.phase)[0].text,
			provenanceLabel: "SCENARIO SIMULATION",
			missionDayRange: [start, end],
			relations: p.level === "ALL CLEAR" ? SEP_SYSTEM_RELATIONS.filter((r) => r.id === "immuneRadiation") : [...SEP_SYSTEM_RELATIONS],
			actions: scenarioActions(p.level, day, p.phase),
			basis: basisFor("Environmental hazard assessment (scenario simulation)", `Simulated SEP phase "${p.phase}" on mission day ${day}`, "scenario-simulation", { ...SHELTER_REFERENCE }, SHELTER_NOTE)
		}];
	}
	function donkiAdvisories(events, now) {
		const windowMs = 2592e5;
		const recent = events.filter((e) => e.type === "SEP" && e.dataSource !== "archived" && e.startTime).filter((e) => {
			const t = Date.parse(e.startTime ?? "");
			return !Number.isNaN(t) && now - t >= 0 && now - t <= windowMs;
		})[0];
		if (!recent) return [];
		const basis = basisFor("NASA DONKI solar energetic particle record", `SEP start within the last 72 h in ${recent.dataSource} data`, "astra-assumption", { ...ARTEMIS_SPACE_WEATHER_REFERENCE }, "Context only. The 72-hour awareness window is an ASTRA-MED assumption. DONKI describes near-Earth conditions, not this vehicle.");
		return [{
			id: `donki:${recent.id}`,
			source: "donki",
			severity: "CAUTION",
			level: "WATCH",
			phase: "Real-world awareness",
			title: "NASA DONKI reports a recent SEP event",
			summary: `DONKI recorded a solar energetic particle event starting ${recent.startTime}. This is real-world space weather near Earth, not a reading from this vehicle and not a personal dose.`,
			whyItMatters: "SEP events are a radiation hazard indicator. The crew's exposure comes from dosimeters and the mission's validated models.",
			nextStep: "Review the space-weather monitor and the mission-approved radiation procedure. Follow shelter instructions only when directed.",
			provenanceLabel: recent.dataSource === "live" ? "NASA DONKI LIVE" : "NASA DONKI CACHED",
			...recent.startTime ? { startTime: recent.startTime } : {},
			relations: SEP_SYSTEM_RELATIONS.filter((r) => r.id === "immuneRadiation"),
			actions: [{
				id: "donki-review",
				text: "Review the space-weather monitor and the mission-approved radiation procedure. Follow shelter instructions only when directed.",
				systems: ["immuneRadiation"],
				basis
			}],
			basis
		}];
	}
	// src/utils/prng.ts
	/** Deterministic pseudo-random helpers so the synthetic mission is identical on every load. */
	/** mulberry32: small, fast, good enough for demo data. Returns floats in [0, 1). */
	function mulberry32(seed) {
		let a = seed >>> 0;
		return () => {
			a = a + 1831565813 >>> 0;
			let t = a;
			t = Math.imul(t ^ t >>> 15, t | 1);
			t ^= t + Math.imul(t ^ t >>> 7, t | 61);
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	}
	/** Standard normal sample (Box–Muller) from a uniform source. */
	function gaussian(rand) {
		let u = 0;
		while (u === 0) u = rand();
		const v = rand();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}
	/** First-order autoregressive noise: smooth day-to-day variation instead of white noise. */
	function ar1Series(rand, length, phi, sigma) {
		const out = [];
		const innovation = sigma * Math.sqrt(1 - phi * phi);
		let x = gaussian(rand) * sigma;
		for (let i = 0; i < length; i++) {
			x = phi * x + gaussian(rand) * innovation;
			out.push(x);
		}
		return out;
	}
	/** Hash a string to a 32-bit seed (FNV-1a). */
	function hashSeed(text) {
		let h = 2166136261;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
	function roundTo(value, step) {
		const inv = 1 / step;
		return Math.round(value * inv) / inv;
	}
	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}
	/** Smooth 0→1 ramp between edge0 and edge1. */
	function smoothstep(edge0, edge1, x) {
		const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
		return t * t * (3 - 2 * t);
	}
	// src/engine/baselineEngine.ts
	/**
	* Baseline drift: a small Isolation Forest (Liu, Ting and Zhou, 2008) trained
	* on this astronaut's own earlier mission days. It scores how unusual the
	* recent days look when heart rate, blood pressure, temperature, sleep and
	* mood are taken together, and names the indicators that moved most against
	* the personal baseline.
	*
	* Pure and deterministic (seeded). A drift cue is an early-warning prompt to
	* keep measuring carefully; it never changes a health status and is not a
	* diagnosis.
	*/
	var num$2 = (v) => typeof v === "number" && Number.isFinite(v) ? v : void 0;
	var bp$1 = (v, k) => typeof v === "object" && v !== null && "systolic" in v && Number.isFinite(v[k]) ? v[k] : void 0;
	var DRIFT_FEATURES = [
		{
			id: "heartRate",
			label: "Resting heart rate",
			unit: "bpm",
			decimals: 0,
			read: (d) => num$2(d.readings.heartRate?.value)
		},
		{
			id: "systolic",
			label: "Systolic blood pressure",
			unit: "mmHg",
			decimals: 0,
			read: (d) => bp$1(d.readings.bloodPressure?.value, "systolic")
		},
		{
			id: "diastolic",
			label: "Diastolic blood pressure",
			unit: "mmHg",
			decimals: 0,
			read: (d) => bp$1(d.readings.bloodPressure?.value, "diastolic")
		},
		{
			id: "bodyTemperature",
			label: "Body temperature",
			unit: "°C",
			decimals: 1,
			read: (d) => num$2(d.readings.bodyTemperature?.value)
		},
		{
			id: "sleep",
			label: "Sleep",
			unit: "h",
			decimals: 1,
			read: (d) => num$2(d.readings.sleep?.value)
		},
		{
			id: "mood",
			label: "Mood",
			unit: "/ 5",
			decimals: 1,
			read: (d) => num$2(d.readings.mood?.value)
		}
	];
	var EULER = .5772156649;
	/** Average path length of an unsuccessful binary-search-tree lookup among n points. */
	function averagePathLength(n) {
		if (n <= 1) return 0;
		if (n === 2) return 1;
		return 2 * (Math.log(n - 1) + EULER) - 2 * (n - 1) / n;
	}
	function buildTree(rows, depth, limit, rand) {
		if (depth >= limit || rows.length <= 1) return {
			kind: "leaf",
			size: rows.length
		};
		const width = rows[0].length;
		for (let attempt = 0; attempt < width; attempt++) {
			const feature = Math.floor(rand() * width);
			let min = Infinity;
			let max = -Infinity;
			for (const r of rows) {
				const v = r[feature];
				if (v < min) min = v;
				if (v > max) max = v;
			}
			if (max <= min) continue;
			const value = min + rand() * (max - min);
			const left = rows.filter((r) => r[feature] < value);
			const right = rows.filter((r) => r[feature] >= value);
			return {
				kind: "split",
				feature,
				value,
				left: buildTree(left, depth + 1, limit, rand),
				right: buildTree(right, depth + 1, limit, rand)
			};
		}
		return {
			kind: "leaf",
			size: rows.length
		};
	}
	/** Train on rows of equal width. Each tree sees a random subsample without replacement. */
	function trainIsolationForest(rows, options) {
		const rand = mulberry32(options.seed);
		const sampleSize = Math.min(options.sampleSize, rows.length);
		const limit = Math.ceil(Math.log2(Math.max(2, sampleSize)));
		const trees = [];
		for (let t = 0; t < options.trees; t++) {
			const pool = rows.slice();
			for (let i = pool.length - 1; i > 0; i--) {
				const j = Math.floor(rand() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
			trees.push(buildTree(pool.slice(0, sampleSize), 0, limit, rand));
		}
		return {
			trees,
			sampleSize
		};
	}
	function pathLength(node, x, depth) {
		if (node.kind === "leaf") return depth + averagePathLength(node.size);
		return pathLength(x[node.feature] < node.value ? node.left : node.right, x, depth + 1);
	}
	/** Anomaly score in (0, 1]. About 0.5 is ordinary; values near 1 isolate quickly. */
	function anomalyScore(forest, x) {
		const mean = forest.trees.reduce((s, t) => s + pathLength(t, x, 0), 0) / forest.trees.length;
		const c = averagePathLength(forest.sampleSize);
		return c === 0 ? .5 : 2 ** (-mean / c);
	}
	function stats(values) {
		if (values.length < 3) return null;
		const mean = values.reduce((s, v) => s + v, 0) / values.length;
		const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
		return {
			mean,
			sd: Math.sqrt(variance)
		};
	}
	function fmt$1(v, decimals) {
		return new Intl.NumberFormat("en", {
			maximumFractionDigits: decimals,
			minimumFractionDigits: decimals
		}).format(v);
	}
	function rowFor(day, base) {
		if (!day) return null;
		let missing = 0;
		const row = DRIFT_FEATURES.map((f, i) => {
			const s = base[i];
			const v = f.read(day);
			if (!s) return 0;
			if (v === void 0) {
				missing++;
				return 0;
			}
			return (v - s.mean) / Math.max(s.sd, 1e-6);
		});
		return missing > DRIFT_FEATURES.length / 2 ? null : row;
	}
	var insufficient = (day, baselineDays, text) => ({
		state: "insufficient",
		day,
		baselineDays,
		trainingDays: null,
		scores: [],
		unusualDays: 0,
		latestScore: null,
		drivers: [],
		text
	});
	/**
	* Score the recent window ending on `day` against a forest trained on earlier
	* days. Features are standardised with the personal baseline (the first
	* `baselineDays` mission days), so drivers read as "x% above your baseline".
	*/
	function baselineDrift(days, day, config = BASELINE_DRIFT) {
		const baselineDays = [1, config.baselineDays];
		const base = DRIFT_FEATURES.map((f) => stats(days.slice(0, config.baselineDays).map((d) => f.read(d)).filter((v) => v !== void 0)));
		if (base.every((s) => s === null)) return insufficient(day, baselineDays, "Not enough readings yet to learn a personal baseline.");
		const recentFrom = Math.max(1, day - config.recentDays + 1);
		const trainTo = recentFrom - 1;
		const trainFrom = Math.max(1, trainTo - config.maxTrainingDays + 1);
		const training = [];
		for (let d = trainFrom; d <= trainTo; d++) {
			const r = rowFor(days[d - 1], base);
			if (r) training.push(r);
		}
		if (training.length < config.minTrainingDays) return insufficient(day, baselineDays, `Pattern learning starts once ${config.minTrainingDays + config.recentDays} days of readings exist.`);
		const forest = trainIsolationForest(training, {
			trees: config.trees,
			sampleSize: config.sampleSize,
			seed: config.seed + trainTo
		});
		const scores = [];
		for (let d = recentFrom; d <= day; d++) {
			const r = rowFor(days[d - 1], base);
			if (r) scores.push({
				day: d,
				score: anomalyScore(forest, r)
			});
		}
		const unusualDays = scores.filter((s) => s.score >= config.unusualScore).length;
		const drivers = [];
		DRIFT_FEATURES.forEach((f, i) => {
			const s = base[i];
			if (!s) return;
			const recent = [];
			for (let d = recentFrom; d <= day; d++) {
				const v = days[d - 1] ? f.read(days[d - 1]) : void 0;
				if (v !== void 0) recent.push(v);
			}
			if (recent.length < 3) return;
			const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
			const z = (recentMean - s.mean) / Math.max(s.sd, 1e-6);
			if (Math.abs(z) < config.driverZ) return;
			const pctChange = s.mean === 0 ? 0 : (recentMean - s.mean) / Math.abs(s.mean) * 100;
			const direction = z > 0 ? "higher" : "lower";
			drivers.push({
				feature: f.id,
				label: f.label,
				unit: f.unit,
				baselineMean: s.mean,
				recentMean,
				pctChange,
				z,
				direction,
				text: `${f.label} averaged ${fmt$1(recentMean, f.decimals)} ${f.unit} over the last ${recent.length} days, ${fmt$1(Math.abs(pctChange), 0)}% ${direction} than your baseline of ${fmt$1(s.mean, f.decimals)} ${f.unit}.`
			});
		});
		drivers.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
		const latestScore = scores.at(-1)?.score ?? null;
		const drift = unusualDays >= config.minUnusualDays && drivers.length > 0;
		const text = drift ? `${unusualDays} of the last ${scores.length} days look unlike your own earlier pattern. ${drivers[0].text} This is a pattern cue, not a diagnosis: keep measuring at the same time and posture.` : "Recent days look like your own earlier pattern.";
		return {
			state: drift ? "drift" : "steady",
			day,
			baselineDays,
			trainingDays: [trainFrom, trainTo],
			scores,
			unusualDays,
			latestScore,
			drivers,
			text
		};
	}
	// src/engine/diagnosticEngine.ts
	/**
	* Deterministic rules engine.
	*
	* - Evaluates readings against the configured prototype thresholds.
	* - Applies persistence rules where the configuration requires several days.
	* - Flags stale or missing measurements.
	* - Explains every status with the rule that produced it.
	* - Never changes a recorded measurement, never names a disease and never
	*   prescribes medication or treatment.
	*/
	var STALE_AFTER = {
		heartRate: HEART_RATE.staleAfterDays,
		bloodPressure: BLOOD_PRESSURE.staleAfterDays,
		bloodGlucose: BLOOD_GLUCOSE.staleAfterDays,
		bodyTemperature: BODY_TEMPERATURE.staleAfterDays,
		sleep: SLEEP.staleAfterDays,
		mood: MOOD.staleAfterDays,
		aredMinutes: ARED.staleAfterDays,
		radiation: RADIATION.staleAfterDays,
		pvt: PVT.staleAfterDays,
		hydration: HYDRATION.staleAfterDays,
		symptoms: SYMPTOMS.staleAfterDays
	};
	var REPEAT = "Repeat the measurement using the instructions.";
	var RECORD = "Record symptoms and contact the medical officer when communication is available.";
	function worst(a, b) {
		return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
	}
	function rule(ruleId, status, description, observed, threshold, provenance) {
		return {
			ruleId,
			status,
			description,
			observed,
			threshold,
			provenance
		};
	}
	function readingOn(days, day, metricId) {
		return days[day - 1]?.readings[metricId];
	}
	function num$1(r) {
		return r && typeof r.value === "number" ? r.value : void 0;
	}
	/** Most recent reading on or before `day`, searching back at most `lookback` days. */
	function latestReading(days, day, metricId, lookback = 45) {
		for (let d = day; d >= Math.max(1, day - lookback); d--) {
			const r = readingOn(days, d, metricId);
			if (r) return r;
		}
		return null;
	}
	function consecutiveDays(days, day, metricId, test) {
		let n = 0;
		for (let d = day; d >= 1; d--) {
			const v = num$1(readingOn(days, d, metricId));
			if (v === void 0 || !test(v)) break;
			n++;
		}
		return n;
	}
	function median(values) {
		if (values.length === 0) return null;
		const s = values.toSorted((a, b) => a - b);
		const mid = Math.floor(s.length / 2);
		return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
	}
	var nominal = (summary, explanation, next, notes = []) => ({
		status: "NOMINAL",
		rules: [],
		notes,
		summary,
		explanation,
		next
	});
	function evalHeartRate(_input, _day, r) {
		const v = num$1(r) ?? NaN;
		const p = HEART_RATE.provenance;
		const why = "Fluid shifts and cardiovascular adaptation in microgravity change resting heart rate. Exertion, stress, sleep loss or illness can also raise it.";
		if (v > HEART_RATE.criticalAbove) return {
			status: "CRITICAL",
			rules: [rule("hr-critical-high", "CRITICAL", "Above the configured critical limit", `${v} bpm`, `> ${HEART_RATE.criticalAbove} bpm`, p)],
			notes: [],
			summary: `Resting heart rate is ${v} bpm, above the configured critical limit of ${HEART_RATE.criticalAbove} bpm.`,
			explanation: why,
			next: `${REPEAT} If it is confirmed, follow the mission-approved cardiovascular protocol. ${RECORD}`
		};
		if (v > HEART_RATE.cautionAbove || v < HEART_RATE.cautionBelow) {
			const high = v > HEART_RATE.cautionAbove;
			return {
				status: "CAUTION",
				rules: [rule(high ? "hr-caution-high" : "hr-caution-low", "CAUTION", "Outside the configured demonstration range", `${v} bpm`, high ? `> ${HEART_RATE.cautionAbove} bpm` : `< ${HEART_RATE.cautionBelow} bpm`, p)],
				notes: [],
				summary: `Resting heart rate is ${v} bpm, ${high ? "above" : "below"} the configured caution limit of ${high ? HEART_RATE.cautionAbove : HEART_RATE.cautionBelow} bpm.`,
				explanation: why,
				next: `${REPEAT} Use the same posture and rest period, then review the mission-approved cardiovascular protocol.`
			};
		}
		const notes = [];
		if (v > HEART_RATE.reference.max) notes.push("Above the configured reference range, below the caution limit.");
		if (v < HEART_RATE.reference.min) notes.push("Below the configured reference range, above the caution limit.");
		return nominal(`Resting heart rate is ${v} bpm, inside the configured demonstration range.`, why, "Keep measuring at the same time and posture each day.", notes);
	}
	function evalBloodPressure(_input, _day, r) {
		if (!isBloodPressure(r.value)) return nominal("No valid blood-pressure value.", "", REPEAT);
		const { systolic: s, diastolic: d } = r.value;
		const t = BLOOD_PRESSURE;
		const p = t.provenance;
		const obs = `${s}/${d} mmHg`;
		const why = "Headward fluid shift and changes in blood volume alter blood pressure in microgravity. Cuff position, posture and recent exercise also change readings.";
		const critHigh = s > t.criticalAbove.systolic || d > t.criticalAbove.diastolic;
		const critLow = s < t.criticalBelow.systolic || d < t.criticalBelow.diastolic;
		if (critHigh || critLow) return {
			status: "CRITICAL",
			rules: [rule(critHigh ? "bp-critical-high" : "bp-critical-low", "CRITICAL", "Beyond the configured critical limit", obs, critHigh ? `> ${t.criticalAbove.systolic}/${t.criticalAbove.diastolic} mmHg` : `< ${t.criticalBelow.systolic}/${t.criticalBelow.diastolic} mmHg`, p)],
			notes: [],
			summary: `Blood pressure is ${obs}, beyond the configured critical limit.`,
			explanation: why,
			next: `${REPEAT} If it is confirmed, follow the mission-approved cardiovascular protocol. ${RECORD}`
		};
		const cHigh = s > t.cautionAbove.systolic || d > t.cautionAbove.diastolic;
		const cLow = s < t.cautionBelow.systolic || d < t.cautionBelow.diastolic;
		if (cHigh || cLow) return {
			status: "CAUTION",
			rules: [rule(cHigh ? "bp-caution-high" : "bp-caution-low", "CAUTION", "Outside the configured demonstration range", obs, cHigh ? `> ${t.cautionAbove.systolic}/${t.cautionAbove.diastolic} mmHg` : `< ${t.cautionBelow.systolic}/${t.cautionBelow.diastolic} mmHg`, p)],
			notes: [],
			summary: `Blood pressure is ${obs}, ${cHigh ? "above" : "below"} the configured caution limit.`,
			explanation: why,
			next: `${REPEAT} Rest for the protocol period, use the same arm and posture, and review the mission-approved cardiovascular protocol.`
		};
		const notes = [];
		if (s > t.reference.systolic.max || d > t.reference.diastolic.max) notes.push("Above the configured reference range, below the caution limit.");
		if (s < t.reference.systolic.min || d < t.reference.diastolic.min) notes.push("Below the configured reference range, above the caution limit.");
		return nominal(`Blood pressure is ${obs}, inside the configured demonstration range.`, why, "Keep the same cuff, arm and posture for each reading.", notes);
	}
	function evalTemperature(_input, _day, r) {
		const v = num$1(r) ?? NaN;
		const t = BODY_TEMPERATURE;
		const obs = `${formatMetricValue("bodyTemperature", v)} °C`;
		const why = "Heat leaves the body more slowly without convection, and a raised temperature can be an early sign of illness.";
		if (v >= t.criticalAtOrAbove) return {
			status: "CRITICAL",
			rules: [rule("temp-critical", "CRITICAL", "At or above the configured critical limit", obs, `≥ ${t.criticalAtOrAbove} °C`, t.provenance)],
			notes: [],
			summary: `Body temperature is ${obs}, at or above the configured critical limit of ${t.criticalAtOrAbove} °C.`,
			explanation: why,
			next: `${REPEAT} If it is confirmed, follow the mission-approved illness protocol. ${RECORD}`
		};
		if (v >= t.cautionAtOrAbove) return {
			status: "CAUTION",
			rules: [rule("temp-caution-high", "CAUTION", "Outside the configured demonstration range", obs, `${t.cautionAtOrAbove}–${(t.criticalAtOrAbove - .1).toFixed(1)} °C`, t.provenance)],
			notes: [],
			summary: `Body temperature is ${obs}, above the configured reference range.`,
			explanation: why,
			next: "Repeat the measurement after 30 minutes at rest, away from exercise. Record any symptoms and review the mission-approved protocol."
		};
		if (v < t.cautionBelow) return {
			status: "CAUTION",
			rules: [rule("temp-caution-low", "CAUTION", "Below the configured low limit", obs, `< ${t.cautionBelow} °C`, t.cautionBelowProvenance)],
			notes: [],
			summary: `Body temperature is ${obs}, below the configured low limit.`,
			explanation: "Low readings are often a measurement-site or device issue, but they need confirming.",
			next: `${REPEAT} Check the measurement site and device, then review the mission-approved protocol.`
		};
		const notes = v < t.reference.min ? ["Below the configured reference range, above the low limit."] : [];
		return nominal(`Body temperature is ${obs}, inside the configured demonstration range.`, why, "Measure at the same site and time each day.", notes);
	}
	function evalGlucose(_input, _day, r) {
		const v = num$1(r) ?? NaN;
		const t = BLOOD_GLUCOSE;
		const obs = `${v} mg/dL`;
		const why = `Sleep, meal timing, reduced loading and stress can all change glucose on a long mission. A single value needs its timing context.${r.glucoseContext === "post-meal" ? " The reading is recorded as post-meal; compare it with the mission timing protocol." : ""}`;
		if (v >= t.criticalAtOrAbove || v < t.criticalBelow) {
			const high = v >= t.criticalAtOrAbove;
			return {
				status: "CRITICAL",
				rules: [rule(high ? "glu-critical-high" : "glu-critical-low", "CRITICAL", "Beyond the configured critical limit", obs, high ? `≥ ${t.criticalAtOrAbove} mg/dL` : `< ${t.criticalBelow} mg/dL`, t.provenance)],
				notes: [],
				summary: `Blood glucose is ${obs}, ${high ? "at or above" : "below"} the configured critical limit.`,
				explanation: why,
				next: `${REPEAT} Follow the mission-approved protocol for unusual results. ${RECORD}`
			};
		}
		if (v >= t.cautionAtOrAbove || v < t.cautionBelow) {
			const high = v >= t.cautionAtOrAbove;
			return {
				status: "CAUTION",
				rules: [rule(high ? "glu-caution-high" : "glu-caution-low", "CAUTION", "Outside the configured demonstration range", obs, high ? `${t.cautionAtOrAbove}–${t.criticalAtOrAbove - 1} mg/dL` : `< ${t.cautionBelow} mg/dL`, t.provenance)],
				notes: r.glucoseContext ? [`Recorded as ${r.glucoseContext}.`] : [],
				summary: `Blood glucose is ${obs}, ${high ? "above" : "below"} the configured demonstration range.`,
				explanation: why,
				next: "Repeat at the next protocol time point and record whether it is fasting or post-meal. Review the mission-approved protocol if it stays outside the range."
			};
		}
		const notes = [];
		if (v > t.reference.max) notes.push("Above the configured reference range, below the caution limit.");
		if (r.glucoseContext) notes.push(`Recorded as ${r.glucoseContext}.`);
		return nominal(`Blood glucose is ${obs}, inside the configured demonstration range.`, why, "Keep the scheduled glucose checks and note the timing context.", notes);
	}
	function evalSleep(input, day, r) {
		const v = num$1(r) ?? NaN;
		const t = SLEEP;
		const obs = `${formatMetricValue("sleep", v)} h`;
		const why = "Repeated short sleep may affect attention and reaction time. Light cues, noise and schedule shifts disrupt sleep on a spacecraft.";
		if (v < t.criticalBelow) return {
			status: "CRITICAL",
			rules: [rule("sleep-critical", "CRITICAL", "Below the configured critical limit", obs, `< ${t.criticalBelow} h`, t.provenance)],
			notes: [],
			summary: `Sleep was ${obs}, below the configured critical limit of ${t.criticalBelow} h.`,
			explanation: why,
			next: "Avoid starting safety-critical tasks without review. Follow the approved sleep and fatigue protocol and tell the medical officer when communication is available."
		};
		const run = consecutiveDays(input.days, day, "sleep", (x) => x < t.cautionBelow);
		if (run >= t.cautionPersistenceDays) return {
			status: "CAUTION",
			rules: [rule("sleep-caution-persistent", "CAUTION", `Below target for ${t.cautionPersistenceDays}+ consecutive days`, `${obs}, ${run} days in a row`, `< ${t.cautionBelow} h for ${t.cautionPersistenceDays}+ days`, t.provenance)],
			notes: [],
			summary: `Sleep has been below the configured target for ${run} consecutive days (latest ${obs}).`,
			explanation: why,
			next: "Complete the scheduled rest-period check and review the approved sleep routine."
		};
		if (v < t.singleNightCautionBelow) return {
			status: "CAUTION",
			rules: [rule("sleep-caution-single", "CAUTION", "One very short sleep period", obs, `< ${t.singleNightCautionBelow} h`, t.singleNightProvenance)],
			notes: [],
			summary: `Sleep was ${obs}, a very short sleep period.`,
			explanation: why,
			next: "Review the approved sleep routine and log tonight's sleep. Take extra care with safety-critical work today."
		};
		if (v < t.cautionBelow) return nominal(`Sleep was ${obs}, below the ${t.cautionBelow} h target for one night.`, why, "Log tonight's sleep. If it is short again, review the approved sleep routine.", [`One short night. Caution applies after ${t.cautionPersistenceDays} consecutive nights below ${t.cautionBelow} h.`]);
		return nominal(`Sleep was ${obs}, inside the configured reference range.`, why, "Keep logging sleep with the same method each day.");
	}
	function evalMood(input, day, r) {
		const v = num$1(r) ?? NaN;
		const t = MOOD;
		const obs = `${formatMetricValue("mood", v)} / 5`;
		const why = "Isolation, confinement, distance from home and workload affect wellbeing on long missions. A persistent change matters more than a single day.";
		if (v <= t.criticalAtOrBelow) return {
			status: "CRITICAL",
			rules: [rule("mood-critical", "CRITICAL", "At or below the configured critical limit", obs, `≤ ${t.criticalAtOrBelow}`, t.provenance)],
			notes: [],
			summary: `Mood check-in is ${obs}, at or below the configured critical limit.`,
			explanation: why,
			next: "Use the mission's approved behavioural-health resources now and contact the medical officer or a crewmate. Record how you feel when communication is available."
		};
		const run = consecutiveDays(input.days, day, "mood", (x) => x <= t.cautionAtOrBelow);
		if (run >= t.cautionPersistenceDays) return {
			status: "CAUTION",
			rules: [rule("mood-caution-persistent", "CAUTION", `Low for ${t.cautionPersistenceDays}+ consecutive days`, `${obs}, ${run} days in a row`, `≤ ${t.cautionAtOrBelow} for ${t.cautionPersistenceDays}+ days`, t.provenance)],
			notes: [],
			summary: `Mood check-ins have been low for ${run} consecutive days (latest ${obs}).`,
			explanation: why,
			next: "Review the approved behavioural-health resources and plan a private conference with the medical officer when communication is available."
		};
		const notes = v <= t.cautionAtOrBelow ? [`One low check-in. Caution applies after ${t.cautionPersistenceDays} consecutive low days.`] : [];
		return nominal(`Mood check-in is ${obs}.`, why, "Keep using the same scale each day.", notes);
	}
	function evalAred(input, day, r) {
		const v = num$1(r) ?? NaN;
		const target = input.settings.aredTargetMinutes;
		const obs = `${v} min`;
		const why = "Reduced mechanical loading contributes to bone and muscle loss, and resistive exercise is a key countermeasure. Minutes show adherence, not bone density.";
		const noIntensity = "Do not increase intensity or duration to make up for missed time.";
		let missed = 0;
		for (let d = day; d > Math.max(0, day - ARED.criticalWindowDays); d--) {
			const m = num$1(readingOn(input.days, d, "aredMinutes"));
			if (m !== void 0 && m < target * ARED.missedFraction) missed++;
		}
		if (missed >= ARED.criticalMissedSessions) return {
			status: "CRITICAL",
			rules: [rule("ared-critical-missed", "CRITICAL", "Repeated missed sessions", `${missed} missed in ${ARED.criticalWindowDays} days`, `≥ ${ARED.criticalMissedSessions} sessions below ${Math.round(ARED.missedFraction * 100)}% of plan`, ARED.ruleProvenance)],
			notes: [],
			summary: `${missed} resistive exercise sessions were missed in the last ${ARED.criticalWindowDays} days.`,
			explanation: why,
			next: `Report the missed sessions and review the exercise plan with the medical officer when communication is available. ${noIntensity}`
		};
		if (v < target) return {
			status: "CAUTION",
			rules: [rule("ared-caution-below-plan", "CAUTION", "Below the planned target", obs, `< ${target} min (demo plan)`, ARED.targetProvenance)],
			notes: [],
			summary: `Resistive exercise was ${obs}, below today's planned ${target} min.`,
			explanation: why,
			next: `Record why the session was short (equipment, schedule or discomfort). Complete only the next assigned session. ${noIntensity}`
		};
		return nominal(`Resistive exercise was ${obs}, meeting the ${target} min demo plan.`, why, "Complete only the assigned session in today's plan.");
	}
	function evalRadiation(input, day, r) {
		const cumulative = num$1(r) ?? 0;
		const daily = input.days[day - 1]?.dailyRadiationMsv ?? 0;
		const prior = [];
		for (let d = day - 1; d >= Math.max(1, day - RADIATION.trailingWindowDays); d--) {
			const x = input.days[d - 1]?.dailyRadiationMsv;
			if (x !== void 0) prior.push(x);
		}
		const med = median(prior);
		const why = "Outside Earth's magnetosphere, galactic cosmic rays deliver a steady dose and solar particle events can add more. Only the dosimeter gives your personal dose.";
		const obs = `${formatDose(daily)} today, ${formatDose(cumulative, 1)} cumulative`;
		const limit = input.settings.radiationLimitMsv ?? RADIATION.limit.default;
		const cautionAt = Math.round(limit * RADIATION.cautionFraction);
		const next = "Follow the approved mission exposure protocol and contact the medical officer when communication is available.";
		if (cumulative >= limit) return {
			status: "CRITICAL",
			rules: [rule("rad-limit", "CRITICAL", "At or above the mission dose limit", formatDose(cumulative, 1), `≥ ${limit} mSv`, RADIATION.limitProvenance)],
			notes: [],
			summary: `Cumulative dose ${formatDose(cumulative, 1)} has reached the configured mission limit of ${limit} mSv.`,
			explanation: why,
			next
		};
		if (cumulative >= cautionAt) return {
			status: "CAUTION",
			rules: [rule("rad-near-limit", "CAUTION", "Near the mission dose limit", formatDose(cumulative, 1), `≥ ${cautionAt} mSv (${Math.round(RADIATION.cautionFraction * 100)}% of ${limit} mSv)`, RADIATION.limitProvenance)],
			notes: [],
			summary: `Cumulative dose ${formatDose(cumulative, 1)} is above ${Math.round(RADIATION.cautionFraction * 100)}% of the configured mission limit.`,
			explanation: why,
			next
		};
		if (med !== null && prior.length >= 3 && daily > med * RADIATION.unusualDailyFactor) return {
			status: "CAUTION",
			rules: [rule("rad-unusual-daily", "CAUTION", "Unusual daily increase", formatDose(daily), `> ${RADIATION.unusualDailyFactor}× trailing ${RADIATION.trailingWindowDays}-day median (${formatDose(med)})`, RADIATION.ruleProvenance)],
			notes: ["Personal dose comes from the dosimeter. Space-weather events are shown separately and never create a dose value."],
			summary: `Dosimeter daily dose is ${formatDose(daily)}, more than ${RADIATION.unusualDailyFactor}× the usual daily dose.`,
			explanation: why,
			next: "Confirm the dosimeter reading is current and from your device. Review the space-weather monitor and follow the approved radiation protection and shelter procedure when directed."
		};
		return nominal(`Dosimeter shows ${obs}, within the usual daily range.`, why, "Review the dosimeter and the space-weather monitor once per day.", [`Mission dose limit: ${limit} mSv (adjustable in Thresholds).`]);
	}
	function pvtBaseline(days) {
		const v = [];
		for (let d = 1; d <= PVT.baselineDays; d++) {
			const x = num$1(readingOn(days, d, "pvt"));
			if (x !== void 0) v.push(x);
		}
		return median(v);
	}
	function evalPvt(input, day, r) {
		const v = num$1(r) ?? NaN;
		const base = pvtBaseline(input.days);
		const obs = `${v} ms`;
		const why = "Slower reaction time can reveal fatigue from sleep loss or workload before you notice it.";
		const lo = input.settings.pvtMinMs ?? PVT.range.min;
		const hi = input.settings.pvtMaxMs ?? PVT.range.max;
		if (v > hi || v < lo) {
			const slow = v > hi;
			return {
				status: "CAUTION",
				rules: [rule(slow ? "pvt-above-range" : "pvt-below-range", "CAUTION", slow ? "Slower than the configured range" : "Faster than the configured range", obs, `${lo}–${hi} ms`, PVT.provenance)],
				notes: [],
				summary: `PVT mean reaction time ${obs} is outside the configured demonstration range of ${lo}–${hi} ms.`,
				explanation: why,
				next: slow ? "Repeat the measurement. Review recent sleep and workload, take extra care with safety-critical tasks and contact the medical officer when communication is available." : "Repeat the measurement and wait for each stimulus before responding."
			};
		}
		if (base === null || day <= PVT.baselineDays) return nominal(`PVT mean reaction time is ${obs}. Baseline is being established (days 1–${PVT.baselineDays}).`, why, "Complete each scheduled PVT session.");
		const limit = base * (1 + PVT.cautionSlowerFraction);
		let slowChecks = 0;
		for (let d = day; d >= Math.max(1, day - 12) && slowChecks < 10; d--) {
			const x = num$1(readingOn(input.days, d, "pvt"));
			if (x === void 0) continue;
			if (x > limit) slowChecks++;
			else break;
		}
		if (slowChecks >= PVT.cautionPersistenceChecks) return {
			status: "CAUTION",
			rules: [rule("pvt-slow", "CAUTION", "Slower than baseline on consecutive checks", `${obs}, ${slowChecks} checks`, `> ${Math.round(limit)} ms (baseline ${Math.round(base)} ms + ${Math.round(PVT.cautionSlowerFraction * 100)}%)`, PVT.provenance)],
			notes: [],
			summary: `PVT reaction time has been slower than your baseline on ${slowChecks} consecutive checks (latest ${obs}).`,
			explanation: why,
			next: "Review recent sleep and workload. Take extra care with safety-critical tasks and discuss the trend with the medical officer when communication is available."
		};
		const notes = v > limit ? ["One slow check. Caution applies after 2 consecutive slow checks."] : [];
		return nominal(`PVT mean reaction time is ${obs} (baseline ${Math.round(base)} ms).`, why, "Complete each scheduled PVT session.", notes);
	}
	function evalHydration(input, day, r) {
		const v = num$1(r) ?? NaN;
		const target = input.settings.hydrationTargetLiters;
		const obs = `${formatMetricValue("hydration", v)} L`;
		const why = "Thirst is weaker in microgravity, and fluid intake supports cardiovascular adaptation and temperature control.";
		const run = consecutiveDays(input.days, day, "hydration", (x) => x < target);
		if (run >= HYDRATION.cautionPersistenceDays) return {
			status: "CAUTION",
			rules: [rule("hyd-below-plan", "CAUTION", `Below plan for ${HYDRATION.cautionPersistenceDays}+ days`, `${obs}, ${run} days`, `< ${target.toFixed(1)} L (demo plan)`, HYDRATION.ruleProvenance)],
			notes: [],
			summary: `Fluid intake has been below the ${target.toFixed(1)} L demo plan for ${run} consecutive days.`,
			explanation: why,
			next: "Review the mission hydration plan and log intake at the end of today."
		};
		const notes = v < target ? ["One day below plan."] : [];
		return nominal(`Fluid intake was ${obs} against a ${target.toFixed(1)} L demo plan.`, why, "Log fluid intake at the end of each day.", notes);
	}
	function evalSymptoms(input, day) {
		const why = "Fluid shifts toward the head can affect the eyes and vision. A self-check records symptoms; it cannot diagnose SANS.";
		for (let d = day; d > Math.max(0, day - SYMPTOMS.lookbackDays); d--) {
			const r = readingOn(input.days, d, "symptoms");
			if (r && isSymptomValue(r.value)) {
				const list = listSymptoms(r.value);
				if (list.length > 0) return {
					status: "CAUTION",
					rules: [rule("sym-reported", "CAUTION", "Symptom reported", list.join(", "), `Any symptom within ${SYMPTOMS.lookbackDays} days`, SYMPTOMS.provenance)],
					notes: [],
					summary: `Symptom check on day ${d} reported: ${list.join(", ")}.`,
					explanation: why,
					next: "Compare with earlier checks. If the symptom is new or worsening, follow the mission protocol and note it for the medical officer."
				};
			}
		}
		return nominal("Latest symptom check reported no symptoms.", why, "Complete the scheduled vision and symptom check.");
	}
	var EVALUATORS = {
		heartRate: evalHeartRate,
		bloodPressure: evalBloodPressure,
		bodyTemperature: evalTemperature,
		bloodGlucose: evalGlucose,
		sleep: evalSleep,
		mood: evalMood,
		aredMinutes: evalAred,
		radiation: evalRadiation,
		pvt: evalPvt,
		hydration: evalHydration,
		symptoms: (input, day) => evalSymptoms(input, day)
	};
	var statusCache = /* @__PURE__ */ new WeakMap();
	function coreStatus(input, metricId, day) {
		let cache = statusCache.get(input);
		if (!cache) {
			cache = /* @__PURE__ */ new Map();
			statusCache.set(input, cache);
		}
		const key = `${metricId}:${day}`;
		const hit = cache.get(key);
		if (hit) return hit;
		const latest = latestReading(input.days, day, metricId);
		let status;
		if (!latest) status = "CAUTION";
		else {
			status = EVALUATORS[metricId](input, latest.missionDay, latest).status;
			if (day - latest.missionDay > STALE_AFTER[metricId]) status = worst(status, "CAUTION");
		}
		cache.set(key, status);
		return status;
	}
	function evaluateMetric(input, metricId, day) {
		const name = METRIC_GUIDANCE[metricId].name;
		const latest = latestReading(input.days, day, metricId);
		const base = {
			metricId,
			evaluatedAt: input.evaluatedAt,
			missionDay: day
		};
		if (!latest) return {
			...base,
			status: "CAUTION",
			summary: `No ${name.toLowerCase()} reading has been recorded yet.`,
			explanation: "Without a reading, ASTRA-MED cannot evaluate this indicator.",
			recommendedNextStep: `Take a ${name.toLowerCase()} measurement using the guide.`,
			latest: null,
			previous: null,
			freshness: "missing",
			persistenceDays: 1,
			triggeredRules: [rule(`${metricId}-missing`, "CAUTION", "No measurement recorded", "none", "At least one reading", "astra-assumption")],
			notes: [],
			basis: metricBasis(metricId, [rule(`${metricId}-missing`, "CAUTION", "No measurement recorded", "none", "At least one reading", "astra-assumption")])
		};
		const previous = latestReading(input.days, latest.missionDay - 1, metricId);
		const ev = EVALUATORS[metricId](input, latest.missionDay, latest);
		const age = day - latest.missionDay;
		const stale = age > STALE_AFTER[metricId];
		let status = ev.status;
		const rules = [...ev.rules];
		let summary = ev.summary;
		let next = ev.next;
		if (stale) {
			status = worst(status, "CAUTION");
			rules.push(rule(`${metricId}-stale`, "CAUTION", "Measurement is stale", `${age} days old`, `Newer than ${STALE_AFTER[metricId]} days`, "astra-assumption"));
			summary = `The latest ${name.toLowerCase()} reading is ${age} days old. ${summary}`;
			next = `Take a new measurement using the guide. ${next}`;
		}
		let persistenceDays = 0;
		if (status !== "NOMINAL") {
			for (let d = day; d >= 1 && persistenceDays < 60; d--) if (coreStatus(input, metricId, d) === status) persistenceDays++;
			else break;
			if (persistenceDays >= 2 && !/consecutive/.test(summary)) summary += ` This is day ${persistenceDays} at ${status}, which points to a persistent trend rather than a one-time reading.`;
			else if (persistenceDays === 1 && previous) summary += ` The previous reading on day ${previous.missionDay} was ${formatMetricValue(metricId, previous.value)}${metricId === "radiation" ? " mSv cumulative" : ""}, so this is a new deviation.`;
		}
		return {
			...base,
			status,
			summary,
			explanation: ev.explanation,
			recommendedNextStep: next,
			latest,
			previous,
			freshness: stale ? "stale" : "current",
			persistenceDays,
			triggeredRules: rules,
			notes: ev.notes,
			basis: metricBasis(metricId, rules, ev.notes)
		};
	}
	function evaluateAllMetrics(input, day) {
		const out = {};
		for (const id of ALL_METRIC_IDS) out[id] = evaluateMetric(input, id, day);
		return out;
	}
	/** Shared aggregation: CRITICAL if any critical, CAUTION if any caution, else NOMINAL. */
	function aggregateStatus(diagnostics, advisories = []) {
		const counts = {
			NOMINAL: 0,
			CAUTION: 0,
			CRITICAL: 0
		};
		let status = "NOMINAL";
		const drivers = [];
		for (const id of ALL_METRIC_IDS) {
			const d = diagnostics[id];
			counts[d.status]++;
			status = worst(status, d.status);
			if (d.status !== "NOMINAL") drivers.push(d);
		}
		drivers.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || PRIMARY_METRIC_IDS.indexOf(a.metricId) - PRIMARY_METRIC_IDS.indexOf(b.metricId));
		return {
			status,
			counts,
			advisoryCount: advisories.filter((a) => a.severity !== "NOMINAL").length,
			drivers
		};
	}
	/** Overall status for every mission day, plus each metric's status per day. Used by the mission track and chart annotations. */
	function evaluateMissionDays(input) {
		const byMetric = {};
		for (const id of ALL_METRIC_IDS) byMetric[id] = [];
		const overall = [];
		for (let day = 1; day <= input.days.length; day++) {
			let s = "NOMINAL";
			for (const id of ALL_METRIC_IDS) {
				const st = coreStatus(input, id, day);
				byMetric[id].push(st);
				s = worst(s, st);
			}
			overall.push(s);
		}
		return {
			overall,
			byMetric
		};
	}
	// src/engine/bodySystemEngine.ts
	/** A system's status is the most severe status of its metrics. Advisories are listed, not merged into health status. */
	function evaluateBodySystems(diagnostics, advisories) {
		const out = {};
		for (const id of BODY_SYSTEM_IDS) {
			const def = BODY_SYSTEMS[id];
			const diags = def.metrics.map((m) => diagnostics[m]);
			let status = "NOMINAL";
			for (const d of diags) status = worst(status, d.status);
			const sysAdvisories = advisories.filter((a) => a.relations.some((r) => r.id === id));
			const observations = diags.map((d) => {
				const label = METRIC_GUIDANCE[d.metricId].shortName;
				const value = d.latest ? formatWithUnit(d.metricId, d.latest.value) : "no reading";
				const persist = d.status !== "NOMINAL" && d.persistenceDays > 1 ? `, ${d.persistenceDays} days` : "";
				return `${label}: ${value}, ${d.status}${persist}`;
			});
			const top = diags.filter((d) => d.status !== "NOMINAL").sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0];
			const hazardStep = sysAdvisories.flatMap((a) => a.actions).find((x) => x.systems.includes(id));
			const recommendedNextStep = sysAdvisories.some((a) => a.level !== "ALL CLEAR" && a.relations.some((r) => r.id === id && r.relation === "Direct")) && hazardStep ? `${hazardStep.text}${top ? ` Then: ${top.recommendedNextStep}` : ""}` : top ? top.recommendedNextStep : hazardStep ? hazardStep.text : def.nominalNextStep;
			out[id] = {
				id,
				status,
				diagnostics: diags,
				advisories: sysAdvisories,
				observations,
				recommendedNextStep
			};
		}
		return out;
	}
	// src/engine/hazardMap.ts
	/**
	* The five hazards of human spaceflight (NASA HRP), each mapped to what
	* ASTRA-MED measures and does about it, with today's state. Statuses come only
	* from the diagnostic and body-system engines; this file adds no thresholds.
	* Distance from Earth has no health status: it shows the ground link instead.
	*/
	function value(d, label) {
		return d.latest ? `${label} ${formatWithUnit(d.metricId, d.latest.value)}` : `${label}: no reading`;
	}
	function worstOf(list) {
		return list.reduce((a, b) => worst(a, b), "NOMINAL");
	}
	var name = (id) => SPACEFLIGHT_HAZARDS.find((h) => h.id === id).name;
	var delayText = (m) => m < 1 ? `${Math.max(1, Math.round(m * 60))} s` : `${m.toFixed(1)} min`;
	function hazardMap(i) {
		const d = i.diagnostics;
		const hazard = i.advisories.find((a) => a.level !== "ALL CLEAR");
		const level = hazard?.level ?? null;
		const moodDrift = i.drift.state === "drift" ? i.drift.drivers.find((x) => x.feature === "mood" || x.feature === "sleep") : void 0;
		return [
			{
				id: "radiation",
				name: name("radiation"),
				status: i.systems.immuneRadiation.status,
				chip: level ? `HAZARD ${level}` : null,
				facts: [value(d.radiation, "Dosimeter total"), hazard ? `Space weather: ${hazard.level}, ${hazard.phase}` : "No active space-weather hazard"],
				note: "Space weather is an environmental hazard; only the dosimeter measures personal dose.",
				action: { kind: "weather" },
				actionLabel: "Open space weather"
			},
			{
				id: "isolation",
				name: name("isolation"),
				status: worstOf([
					d.mood.status,
					d.sleep.status,
					d.pvt.status
				]),
				chip: null,
				facts: [`${value(d.mood, "Mood")}, ${value(d.sleep, "sleep").toLowerCase()}`, `Last 7 days: ${i.checkInsThisWeek} check-in${i.checkInsThisWeek === 1 ? "" : "s"}, ${i.rechargeMinutesThisWeek} min of recharge`],
				note: moodDrift ? `Pattern check: ${moodDrift.text}` : "Tuesday checks in, watches mood and sleep against your own baseline, and opens the Earth view and games.",
				action: { kind: "tuesday" },
				actionLabel: "Talk to Tuesday"
			},
			{
				id: "distance",
				name: name("distance"),
				status: null,
				chip: i.linkUp ? "GROUND LINK UP" : "NO GROUND LINK",
				facts: [`Signal to Earth ${delayText(i.signalDelayMinutes)} one way, ${delayText(i.signalDelayMinutes * 2)} for a reply`, i.queuedMessages ? `${i.queuedMessages} message${i.queuedMessages === 1 ? "" : "s"} queued for the medical officer` : "Every health function works on board without a link"],
				note: "A question and its answer take at least twice the delay, so the crew acts first and reports after.",
				action: { kind: "contact" },
				actionLabel: "Contact medical officer"
			},
			{
				id: "gravity",
				name: name("gravity"),
				status: worstOf([
					i.systems.cardiovascular.status,
					i.systems.musculoskeletal.status,
					i.systems.neuroOcular.status
				]),
				chip: null,
				facts: [`${value(d.heartRate, "Heart rate")}, ${value(d.bloodPressure, "BP")}`, value(d.aredMinutes, "Resistive exercise")],
				note: "Fluid shifts toward the head, bone and muscle loss, and vision changes (SANS) in weightlessness.",
				action: {
					kind: "system",
					id: "cardiovascular"
				},
				actionLabel: "Show on body map"
			},
			{
				id: "environment",
				name: name("environment"),
				status: worstOf([
					d.bodyTemperature.status,
					d.hydration.status,
					d.symptoms.status,
					d.bloodGlucose.status
				]),
				chip: null,
				facts: [`${value(d.bodyTemperature, "Temperature")}, ${value(d.hydration, "fluids").toLowerCase()}`, value(d.bloodGlucose, "Glucose")],
				note: "Cabin air, CO₂, noise and microbe sensors are not connected in this prototype; body temperature and symptoms are the crew-side signals.",
				action: {
					kind: "guidance",
					metricId: "bodyTemperature"
				},
				actionLabel: "Temperature guide"
			}
		];
	}
	// src/engine/medicalContact.ts
	/**
	* Message for the medical officer, built on the device from engine output and
	* the crew member's own words. ASTRA-MED does not transmit it: the crew copies
	* it into the mission's messaging system when there is a ground link, or
	* queues it on this device until the next contact. Pure functions.
	*/
	function buildMedicalMessage(i) {
		const lines = [];
		const push = (...l) => lines.push(...l);
		push(`${i.priority === "urgent" ? "URGENT" : "ROUTINE"}: MESSAGE FOR THE MEDICAL OFFICER`, `Mission day ${i.day}, ship time ${i.shipTime} UTC.`, i.linkUp ? `Ground link up. One-way signal delay about ${i.signalDelayMinutes.toFixed(1)} min.` : "Written during loss of signal; queued on board for the next contact.", "", "CREW REPORT", i.report.trim() || "(nothing written)", "", "ACTIONS TAKEN ON BOARD", i.actionsTaken.trim() || "(nothing written)", "", `CONSOLE STATUS: ${i.overall} (prototype thresholds; synthetic demo data unless marked as crew-entered)`);
		const flagged = Object.values(i.diagnostics).filter((d) => d.status !== "NOMINAL");
		if (!flagged.length) push("- All indicators inside their configured ranges.");
		for (const d of flagged) {
			const v = d.latest ? formatWithUnit(d.metricId, d.latest.value) : "no reading";
			const rule = d.triggeredRules[0];
			const crewEntered = d.latest?.source === "manual" || d.latest?.source === "tuesday";
			push(`- ${METRIC_GUIDANCE[d.metricId].name}: ${v}, ${d.status}${rule ? ` (rule: ${rule.threshold})` : ""}${crewEntered ? ", logged by crew" : ""}`);
		}
		if (i.drift.state === "drift") push(`- Pattern check: ${i.drift.drivers.map((x) => x.text).join(" ")}`);
		for (const t of i.trends) push(`- Trend watch: ${t.text}`);
		const hazard = i.advisories.find((a) => a.level !== "ALL CLEAR");
		if (hazard) push(`- Environmental hazard ${hazard.level} (${hazard.phase}); not a personal dose.`);
		push("", "REQUEST", i.priority === "urgent" ? "Please advise on next steps as soon as possible." : "Please review at your next opportunity.");
		push("", "Prepared by ASTRA-MED, a prototype. No diagnosis or treatment was suggested by the app.");
		return lines.join("\n");
	}
	// src/engine/protocolEngine.ts
	/**
	* Deterministic self-correction prompts.
	*
	* Turns non-nominal diagnostics, environment advisories and yesterday's missed
	* tasks into follow-up actions that point at pre-approved guidance. It never
	* changes medication, exercise intensity or clinical treatment.
	*/
	var KIND_ORDER = {
		advisory: 0,
		metric: 1,
		"missed-task": 2
	};
	function buildFollowUps(args) {
		const done = args.log[args.day] ?? {};
		const out = [];
		const hazardOwnsDose = args.advisories.some((a) => a.source === "scenario" && a.level !== "ALL CLEAR");
		for (const id of ALL_METRIC_IDS) {
			const d = args.diagnostics[id];
			if (d.status === "NOMINAL") continue;
			if (id === "radiation" && hazardOwnsDose) continue;
			const fid = `metric:${id}`;
			out.push({
				id: fid,
				kind: "metric",
				systems: BODY_SYSTEM_IDS.filter((sys) => BODY_SYSTEMS[sys].metrics.includes(id)),
				severity: d.status,
				title: `Follow up on ${METRIC_GUIDANCE[id].name.toLowerCase()}`,
				reason: d.summary,
				action: d.recommendedNextStep,
				guidance: {
					kind: "metric",
					id
				},
				basis: d.basis,
				completed: Boolean(done[fid]),
				...done[fid] ? { completedAt: done[fid] } : {}
			});
		}
		for (const a of args.advisories) {
			const dose = args.diagnostics.radiation;
			const steps = a.actions.map((act) => {
				const sid = `hazard:${a.source}:${act.id}`;
				const absorbs = hazardOwnsDose && a.source === "scenario" && /dosimeter|record/.test(act.id) && dose.status !== "NOMINAL";
				return {
					id: sid,
					text: act.text,
					systems: act.systems,
					basis: act.basis,
					completed: Boolean(done[sid]),
					...done[sid] ? { completedAt: done[sid] } : {},
					...absorbs ? { alsoResolves: `Dosimeter ${dose.status}: ${dose.summary.split(". ")[0]}.` } : {}
				};
			});
			const firstOpen = steps.find((x) => !x.completed);
			const doneCount = steps.filter((x) => x.completed).length;
			out.push({
				id: `sequence:${a.source}:${a.level}`,
				kind: "advisory",
				systems: [...new Set(steps.flatMap((x) => x.systems))],
				severity: a.severity,
				title: `${a.level === "ALL CLEAR" ? "Post-event steps" : "Protective action sequence"}: ${a.title}`,
				reason: `${a.summary} ${doneCount} of ${steps.length} steps done.`,
				action: firstOpen ? `Step ${steps.indexOf(firstOpen) + 1} of ${steps.length}: ${firstOpen.text}` : "All steps in this sequence are done.",
				guidance: {
					kind: "system",
					id: "immuneRadiation"
				},
				basis: firstOpen?.basis ?? a.basis,
				completed: steps.length > 0 && doneCount === steps.length,
				steps
			});
		}
		if (args.day > 1) for (const t of args.yesterdayTasks) {
			if (t.completed) continue;
			const def = args.taskDefinitions.find((x) => x.id === t.id);
			if (!def) continue;
			const fid = `missed:${t.id}`;
			out.push({
				id: fid,
				kind: "missed-task",
				systems: def.systems,
				severity: "NOMINAL",
				title: `Missed yesterday: ${t.title}`,
				reason: `"${t.title}" was not completed on day ${args.day - 1}.`,
				action: def.missedPrompt,
				guidance: def.guidance,
				basis: basisFor(`Countermeasure task: ${t.title}`, `Not marked complete on mission day ${args.day - 1}`, "mission-plan", null, "Demo mission plan. Example task, not a NASA prescription."),
				completed: Boolean(done[fid]),
				...done[fid] ? { completedAt: done[fid] } : {}
			});
		}
		return out.sort((a, b) => STATUS_RANK[b.severity] - STATUS_RANK[a.severity] || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
	}
	/** The single most important current action for the readiness banner. */
	function mostImportantAction(followUps, tasks, day) {
		const open = followUps.find((f) => !f.completed && f.kind !== "missed-task") ?? followUps.find((f) => !f.completed);
		if (open) return {
			text: open.action,
			severity: open.severity,
			guidance: open.guidance,
			source: "follow-up",
			basis: open.basis
		};
		const task = tasks.find((t) => !t.completed);
		if (task) return {
			text: `Complete "${task.title}" (${task.targetLabel}).`,
			severity: "NOMINAL",
			guidance: task.guidance,
			source: "task",
			basis: basisFor(`Countermeasure task: ${task.title}`, `Scheduled for mission day ${day}`, "mission-plan", null, "Demo mission plan. Example task, not a NASA prescription.")
		};
		return {
			text: `All checks and countermeasures are complete for mission day ${day}.`,
			severity: "NOMINAL",
			guidance: null,
			source: "none",
			basis: null
		};
	}
	// src/engine/readinessEngine.ts
	/**
	* Countermeasure completion, XP, streaks and the prototype readiness score.
	*
	* The readiness score is an operational engagement indicator, NOT a medical
	* clearance. It never changes or hides a health status.
	*
	* XP is derived from completion records, so completing the same task twice on
	* the same mission day can never award XP twice.
	*/
	var SEED_ADHERENCE = {
		nominal: .95,
		cardiovascular: .92,
		sep: .94
	};
	function isScheduled(task, day) {
		return task.everyNDays ? (day - 1) % task.everyNDays === 0 : true;
	}
	function scheduledTasks(input, day) {
		return input.tasks.filter((t) => isScheduled(t, day));
	}
	function numericReading(input, day, metric) {
		const r = input.days[day - 1]?.readings[metric];
		return r && typeof r.value === "number" ? r.value : void 0;
	}
	/** Synthetic adherence history. Deterministic per scenario, day and task. */
	function seededCompletion(input, day, task) {
		if (day === SCENARIOS[input.scenarioId].focusDay) return task.timing === "morning";
		switch (task.id) {
			case "ared-session": {
				const m = numericReading(input, day, "aredMinutes");
				return m !== void 0 && m >= input.aredTargetMinutes;
			}
			case "hydration-check": {
				const h = numericReading(input, day, "hydration");
				return h !== void 0 && h >= input.hydrationTargetLiters;
			}
			case "sleep-log": return input.days[day - 1]?.readings.sleep !== void 0;
			case "pvt-check": return input.days[day - 1]?.readings.pvt !== void 0;
			default: return mulberry32(hashSeed(`${input.scenarioId}:${day}:${task.id}`))() < SEED_ADHERENCE[input.scenarioId];
		}
	}
	function tasksForDay(input, day) {
		const records = input.completions[day] ?? {};
		return scheduledTasks(input, day).map((t) => {
			const rec = records[t.id];
			const completed = rec ? rec.completed : seededCompletion(input, day, t);
			const via = rec ? rec.via : completed ? "seed" : void 0;
			return {
				id: t.id,
				title: t.title,
				description: t.description,
				category: t.category,
				targetLabel: t.targetLabel,
				xp: t.xp,
				completed,
				...rec?.completed && rec.completedAt ? { completedAt: rec.completedAt } : {},
				...via ? { via } : {},
				...t.linkedMetric ? { linkedMetric: t.linkedMetric } : {},
				guidance: t.guidance,
				systems: t.systems
			};
		});
	}
	function dayCompletion(input, day) {
		const tasks = tasksForDay(input, day);
		if (tasks.length === 0) return 1;
		return tasks.filter((t) => t.completed).length / tasks.length;
	}
	/** XP earned on one day: each completed task counts once. */
	function dayXp(input, day) {
		return tasksForDay(input, day).reduce((sum, t) => sum + (t.completed ? t.xp : 0), 0);
	}
	function totalXp(input, upToDay) {
		let sum = 0;
		for (let d = 1; d <= upToDay; d++) sum += dayXp(input, d);
		return sum;
	}
	/**
	* Consecutive days meeting the streak threshold, ending on the selected day.
	* If the selected day is still in progress (below threshold) it does not break
	* the streak; counting starts from the day before.
	*/
	function computeStreak(input, day) {
		let streak = 0;
		let d = day;
		if (dayCompletion(input, d) < COUNTERMEASURES.streakMinCompletion) d--;
		for (; d >= 1; d--) if (dayCompletion(input, d) >= COUNTERMEASURES.streakMinCompletion) streak++;
		else break;
		return streak;
	}
	function weeklyAdherence(input, day) {
		const start = Math.max(1, day - 6);
		let sum = 0;
		for (let d = start; d <= day; d++) sum += dayCompletion(input, d);
		return sum / (day - start + 1);
	}
	/** Points available to each part of the readiness score. They add up to 100 (ASTRA assumption). */
	var READINESS_WEIGHTS = {
		tasks: 50,
		weekly: 20,
		followUps: 15,
		freshness: 15
	};
	function message(score, completed, total) {
		if (total > 0 && completed === total) return "Every scheduled countermeasure is complete for today.";
		if (score >= 85) return "Countermeasures are on track. Keep the routine going.";
		if (score >= 65) return `Good progress: ${completed} of ${total} tasks done. The rest are listed below.`;
		if (score >= 40) return "A few tasks are still open today. Start with the one at the top.";
		return "Today's plan is just starting. Open the first task to begin.";
	}
	function computeReadiness(input, day, followUps, diagnostics) {
		const tasks = tasksForDay(input, day);
		const completedTasks = tasks.filter((t) => t.completed).length;
		const taskCompletion = tasks.length ? completedTasks / tasks.length : 1;
		const weekly = weeklyAdherence(input, day);
		const followUpCompletion = followUps.length ? followUps.filter((f) => f.completed).length / followUps.length : 1;
		const fresh = PRIMARY_METRIC_IDS.filter((id) => diagnostics[id].freshness === "current").length / PRIMARY_METRIC_IDS.length;
		const followUpsDone = followUps.filter((f) => f.completed).length;
		const freshCount = PRIMARY_METRIC_IDS.filter((id) => diagnostics[id].freshness === "current").length;
		const part = (id, label, fraction, detail) => ({
			id,
			label,
			weight: READINESS_WEIGHTS[id],
			fraction,
			points: READINESS_WEIGHTS[id] * fraction,
			detail
		});
		const components = [
			part("tasks", "Today's countermeasure tasks", taskCompletion, `${completedTasks} of ${tasks.length} done`),
			part("weekly", "7-day task adherence", weekly, `${Math.round(weekly * 100)}% average over the last ${Math.min(7, day)} days`),
			part("followUps", "Follow-up actions done", followUpCompletion, followUps.length ? `${followUpsDone} of ${followUps.length} done` : "none needed today, full points"),
			part("freshness", "Fresh required measurements", fresh, `${freshCount} of ${PRIMARY_METRIC_IDS.length} current`)
		];
		const score = Math.round(components.reduce((sum, c) => sum + c.points, 0));
		return {
			score,
			components,
			taskCompletion,
			weeklyAdherence: weekly,
			followUpCompletion,
			dataFreshness: fresh,
			completedTasks,
			totalTasks: tasks.length,
			totalXp: totalXp(input, day),
			todayXp: dayXp(input, day),
			streakDays: computeStreak(input, day),
			message: message(score, completedTasks, tasks.length)
		};
	}
	// src/engine/reportEngine.ts
	/**
	* Plain-text health summary for the flight surgeon. Built on the device from
	* engine output; nothing is sent anywhere. The crew chooses to copy or save it
	* and pass it on through the mission's own channels.
	*/
	var WINDOW = 7;
	function range(days, metric, day) {
		const values = [];
		for (let d = Math.max(1, day - WINDOW + 1); d <= day; d++) {
			const r = days[d - 1]?.readings[metric];
			if (r) values.push(formatMetricValue(metric, r.value));
		}
		return values.length ? values.join(", ") : "no readings";
	}
	function buildSurgeonReport(i) {
		const L = [];
		const push = (...lines) => L.push(...lines);
		const crewEntered = PRIMARY_METRIC_IDS.some((m) => {
			const source = i.diagnostics[m].latest?.source;
			return source === "manual" || source === "tuesday" || source === "device" || source === "device-sim";
		});
		push("ASTRA-MED HEALTH SUMMARY FOR THE FLIGHT SURGEON", `Mission day ${i.day}. Generated ${i.generatedAt} (UTC) on the crew device.`, `Scenario: ${i.scenario.code}, ${i.scenario.name}.`, `Data: ${crewEntered ? "synthetic demo telemetry plus crew-entered readings (manual and Tuesday voice)" : "SYNTHETIC demo telemetry, not real astronaut data"}.`, "Thresholds are prototype demonstration ranges, not NASA flight rules.", `Ship–Earth one-way signal delay on this mission day: ${i.signalDelayMinutes.toFixed(1)} min.`, "", `OVERALL STATUS: ${i.overall.status} (${i.overall.counts.NOMINAL} nominal, ${i.overall.counts.CAUTION} caution, ${i.overall.counts.CRITICAL} critical)`, "", "BODY SYSTEMS");
		for (const id of Object.keys(BODY_SYSTEMS)) push(`- ${BODY_SYSTEMS[id].name}: ${i.systems[id].status}`);
		const flagged = Object.values(i.diagnostics).filter((d) => d.status !== "NOMINAL");
		push("", "INDICATORS OUTSIDE THE CONFIGURED RANGE");
		if (!flagged.length) push("- None.");
		for (const d of flagged) {
			push(`- ${METRIC_GUIDANCE[d.metricId].name}: ${d.status}. ${d.summary}`);
			for (const r of d.triggeredRules) push(`  Rule: ${r.description}, observed ${r.observed}, threshold ${r.threshold} (${r.provenance}).`);
			if (d.persistenceDays > 1) push(`  Persisting for ${d.persistenceDays} days.`);
			push(`  Crew step: ${d.recommendedNextStep}`);
		}
		push("", "TREND WATCH (projections, not diagnoses)");
		if (!i.trends.length) push("- None.");
		for (const t of i.trends) push(`- ${t.text}`);
		if (i.drift) {
			push("", "BASELINE DRIFT (Isolation Forest against this crew member's own earlier days; a cue, not a diagnosis)");
			if (i.drift.state === "insufficient") push(`- ${i.drift.text}`);
			else {
				push(`- ${i.drift.unusualDays} of the last ${i.drift.scores.length} days scored as unusual (training days ${i.drift.trainingDays?.join("–") ?? "n/a"}, baseline days ${i.drift.baselineDays.join("–")}).`);
				for (const d of i.drift.drivers) push(`- ${d.text}`);
			}
		}
		push("", "ENVIRONMENTAL HAZARDS (not personal dose)");
		if (!i.advisories.length) push("- None active.");
		for (const a of i.advisories) push(`- ${a.level}, ${a.phase}: ${a.summary} [${a.provenanceLabel}]`);
		push("", "FOLLOW-UP ACTIONS");
		if (!i.followUps.length) push("- None.");
		for (const f of i.followUps) {
			push(`- [${f.completed ? "done" : "open"}] ${f.title}: ${f.action}`);
			for (const s of f.steps ?? []) push(`    [${s.completed ? "done" : "open"}] ${s.text}`);
		}
		push("", `LAST ${WINDOW} DAYS (oldest first)`);
		for (const m of PRIMARY_METRIC_IDS) push(`- ${METRIC_GUIDANCE[m].name} (${METRIC_UNITS[m]}): ${range(i.days, m, i.day)}`);
		push("", `COUNTERMEASURES: ${i.readiness.completedTasks} of ${i.readiness.totalTasks} tasks done today; readiness ${i.readiness.score}/100 (engagement indicator, not a medical clearance).`, "", "Prepared by the crew with ASTRA-MED, a NASA Space Apps 2026 prototype. Not a medical device.");
		return L.join("\n");
	}
	// src/engine/sunPosition.ts
	/**
	* Subsolar point (where the Sun is overhead) for a real instant, from the
	* low-precision solar coordinates in the Astronomical Almanac (accurate to
	* about 0.01° in declination, enough to draw the day–night line). Pure.
	*/
	var RAD = Math.PI / 180;
	function subsolarPoint(date) {
		const n = date.getTime() / 864e5 + 2440587.5 - 2451545;
		const L = (280.46 + .9856474 * n) % 360;
		const g = (357.528 + .9856003 * n) % 360 * RAD;
		const lambda = (L + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * RAD;
		const epsilon = (23.439 - 4e-7 * n) * RAD;
		const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
		const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
		const gmst = ((280.46061837 + 360.98564736629 * n) % 360 + 360) % 360;
		let lon = ra / RAD - gmst;
		lon = ((lon + 180) % 360 + 360) % 360 - 180;
		return {
			lat: decl / RAD,
			lon
		};
	}
	// src/engine/trendEngine.ts
	/**
	* Trend watch: projects recent NOMINAL readings forward to see whether they
	* are heading for a configured caution limit. Pure functions. A projection is
	* not a prediction of health and never changes a status.
	*/
	var num = (v) => typeof v === "number" ? v : void 0;
	var bp = (k) => (v) => typeof v === "object" && "systolic" in v ? v[k] : void 0;
	var SERIES = [
		{
			metricId: "heartRate",
			unit: "bpm",
			decimals: 0,
			value: num,
			above: HEART_RATE.cautionAbove,
			below: HEART_RATE.cautionBelow,
			watchAbove: HEART_RATE.reference.max,
			watchBelow: HEART_RATE.reference.min
		},
		{
			metricId: "bloodPressure",
			part: "systolic",
			unit: "mmHg",
			decimals: 0,
			value: bp("systolic"),
			above: BLOOD_PRESSURE.cautionAbove.systolic,
			below: BLOOD_PRESSURE.cautionBelow.systolic,
			watchAbove: BLOOD_PRESSURE.reference.systolic.max,
			watchBelow: BLOOD_PRESSURE.reference.systolic.min
		},
		{
			metricId: "bloodPressure",
			part: "diastolic",
			unit: "mmHg",
			decimals: 0,
			value: bp("diastolic"),
			above: BLOOD_PRESSURE.cautionAbove.diastolic,
			below: BLOOD_PRESSURE.cautionBelow.diastolic,
			watchAbove: BLOOD_PRESSURE.reference.diastolic.max,
			watchBelow: BLOOD_PRESSURE.reference.diastolic.min
		},
		{
			metricId: "bodyTemperature",
			unit: "°C",
			decimals: 1,
			value: num,
			above: BODY_TEMPERATURE.cautionAtOrAbove,
			below: BODY_TEMPERATURE.cautionBelow,
			watchAbove: BODY_TEMPERATURE.reference.max,
			watchBelow: BODY_TEMPERATURE.reference.min
		},
		{
			metricId: "bloodGlucose",
			unit: "mg/dL",
			decimals: 0,
			value: num,
			above: BLOOD_GLUCOSE.cautionAtOrAbove,
			below: BLOOD_GLUCOSE.cautionBelow,
			watchAbove: BLOOD_GLUCOSE.reference.max,
			watchBelow: BLOOD_GLUCOSE.reference.min
		},
		{
			metricId: "sleep",
			unit: "h",
			decimals: 1,
			value: num,
			below: SLEEP.cautionBelow,
			watchBelow: TREND_WATCH.sleepWatchBelow
		},
		{
			metricId: "mood",
			unit: "/ 5",
			decimals: 1,
			value: num,
			below: MOOD.cautionAtOrBelow,
			watchBelow: MOOD.reference.min
		}
	];
	/** Least-squares line y = a + b·x and its R². */
	function linearFit(points) {
		const n = points.length;
		const mx = points.reduce((s, [x]) => s + x, 0) / n;
		const my = points.reduce((s, [, y]) => s + y, 0) / n;
		let sxy = 0;
		let sxx = 0;
		let syy = 0;
		for (const [x, y] of points) {
			sxy += (x - mx) * (y - my);
			sxx += (x - mx) ** 2;
			syy += (y - my) ** 2;
		}
		const b = sxx === 0 ? 0 : sxy / sxx;
		return {
			a: my - b * mx,
			b,
			r2: sxx === 0 || syy === 0 ? 0 : sxy * sxy / (sxx * syy)
		};
	}
	function fmt(v, decimals) {
		return new Intl.NumberFormat("en", {
			maximumFractionDigits: decimals,
			minimumFractionDigits: decimals
		}).format(v);
	}
	/** Trend watches for indicators that are NOMINAL on `day`, soonest first. */
	function trendWatch(days, day, diagnostics) {
		const out = [];
		const first = Math.max(1, day - TREND_WATCH.windowDays + 1);
		for (const s of SERIES) {
			if (diagnostics[s.metricId].status !== "NOMINAL") continue;
			const points = [];
			for (let d = first; d <= day; d++) {
				const r = days[d - 1]?.readings[s.metricId];
				const y = r ? s.value(r.value) : void 0;
				if (y !== void 0 && Number.isFinite(y)) points.push([d, y]);
			}
			if (points.length < TREND_WATCH.minReadings) continue;
			const { a, b, r2 } = linearFit(points);
			if (r2 < TREND_WATCH.minFit || b === 0) continue;
			const now = a + b * day;
			const limit = b > 0 ? s.above : s.below;
			const gate = b > 0 ? s.watchAbove : s.watchBelow;
			if (limit === void 0 || gate === void 0) continue;
			const latest = points[points.length - 1][1];
			if (b > 0 ? latest <= gate : latest >= gate) continue;
			const gap = limit - now;
			if (gap / b <= 0) continue;
			const daysToLimit = Math.max(1, Math.ceil(gap / b));
			if (daysToLimit > TREND_WATCH.horizonDays) continue;
			const name = METRIC_GUIDANCE[s.metricId].name;
			const label = s.part ? `${name} (${s.part})` : name;
			const direction = b > 0 ? "rising" : "falling";
			out.push({
				metricId: s.metricId,
				...s.part ? { part: s.part } : {},
				direction,
				slopePerDay: b,
				limit,
				unit: s.unit,
				daysToLimit,
				fit: r2,
				text: `${label} is ${direction} about ${fmt(Math.abs(b), s.decimals + 1)} ${s.unit} a day. If the ${TREND_WATCH.windowDays}-day trend continues it would reach the caution limit of ${fmt(limit, s.decimals)} ${s.unit} in about ${daysToLimit} ${daysToLimit === 1 ? "day" : "days"}. Keep measuring at the same time and posture. This is a projection, not a diagnosis.`
			});
		}
		return out.toSorted((x, y) => x.daysToLimit - y.daysToLimit);
	}
	// src/engine/tuesdayEngine.ts
	/**
	* Tuesday, the crew companion: intent detection, the on-device health brief
	* sent to a local model, the safety filter applied to every model answer, and
	* the offline replies used when no model is running. Pure functions.
	*
	* Tuesday follows the same medical language rules as the rest of ASTRA-MED:
	* no diagnosis, no medication, no change to exercise or treatment.
	*/
	var PATTERNS = [
		["crisis", /\b(kill myself|suicid|self[- ]?harm|hurt myself|end it all|want to die|no reason to live)\b/i],
		["urgent", /\b(chest (pain|pressure|tight)|can'?t breathe|short(ness)? of breath|struggling to breathe|faint(ed|ing)?|pass(ed|ing) out|black(ed)? out|severe headache|worst headache|vision (loss|went|is going)|lost (my )?vision|numb(ness)?|slurred|seizure|bleeding (a lot|heavily|won'?t stop)|heart (is )?(racing|pounding)|palpitation)/i],
		["checkin", /\b(check[- ]?in|log (my )?mood|rate my mood)\b/i],
		["symptom", /\b(heart ?rate|pulse|bpm|blood pressure|temperature|fever|glucose|blood sugar|dizzy|nause|headache|pain|hurts?|sick|unwell|ill|rash|wound|swelling|eye|vision)\b/i],
		["earth", /\b(earth|home planet|window|globe|see home|blue marble)\b/i],
		["game", /\b(game|play|catch|fun)\b/i],
		["breathe", /\b(breath|breathe|breathing|calm down|relax)\b/i],
		["bored", /\b(bored|boring|monoton|nothing to do|same every day)\b/i],
		["tired", /\b(tired|exhausted|fatigue|sleepy|drained|no energy|worn out)\b/i],
		["low", /\b(sad|lonely|alone|miss (my|home|family)|homesick|down|depress|hopeless|cry)\b/i],
		["stressed", /\b(stress|anxious|anxiety|panic|overwhelm|worried|nervous|angry)\b/i],
		["sleep", /\b(sleep|insomnia|nap|rest)\b/i],
		["status", /\b(how am i|my health|status|doing|vitals|heart|readings?|drift|trend|report)\b/i],
		["thanks", /\b(thanks|thank you|cheers|appreciate)\b/i],
		["greeting", /^\s*(hi|hello|hey|morning|good (morning|evening|afternoon)|yo|tuesday)\b/i],
		["help", /\b(help|what can you do|how do you work)\b/i]
	];
	function detectIntent(text) {
		for (const [intent, re] of PATTERNS) if (re.test(text)) return intent;
		return "other";
	}
	/** Answer for a crisis message. Always shown, whether or not a model is running. */
	var CRISIS_REPLY = "I'm really glad you told me. Please tell a crewmate right now, and contact the medical officer or behavioural-health support by the mission's urgent channel. You don't have to handle this alone. I'll stay here with you; if it helps, we can do one slow breathing round together while you reach out.";
	var URGENT_REPLY = "That can be serious, so please don't wait on me. Stop what you're doing and stay still, seated or restrained. Tell a crewmate now, and contact the medical officer by the mission's urgent channel. If you have a mission-approved device, take your heart rate and blood pressure and keep the numbers for the medical officer. Tuesday can't tell what is causing this and gives no treatment.";
	/**
	* Readings typed into a message ("my heart rate is 250 bpm"). Checked against
	* the same prototype thresholds as logged readings, so Tuesday never leaves a
	* dangerous number to a language model.
	*/
	function readingsInText(text) {
		const out = [];
		const hr = text.match(/(\d{2,3})\s*(?:bpm|beats)/i) ?? text.match(/(?:heart ?rate|pulse|hr)\D{0,24}?(\d{2,3})(?!\s*\/)/i);
		if (hr) {
			const v = Number(hr[1]);
			const level = v > HEART_RATE.criticalAbove ? "CRITICAL" : v > HEART_RATE.cautionAbove || v < HEART_RATE.cautionBelow ? "CAUTION" : "NOMINAL";
			out.push({
				metricId: "heartRate",
				label: "Resting heart rate",
				value: `${v} bpm`,
				level,
				limit: level === "CRITICAL" ? `CRITICAL above ${HEART_RATE.criticalAbove} bpm` : v < HEART_RATE.cautionBelow ? `CAUTION below ${HEART_RATE.cautionBelow} bpm` : `CAUTION above ${HEART_RATE.cautionAbove} bpm`,
				outsideDeviceRange: v > HEART_RATE.entry.max || v < HEART_RATE.entry.min
			});
		}
		const bp = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
		if (bp) {
			const sys = Number(bp[1]);
			const dia = Number(bp[2]);
			const c = BLOOD_PRESSURE;
			const critical = sys > c.criticalAbove.systolic || dia > c.criticalAbove.diastolic || sys < c.criticalBelow.systolic || dia < c.criticalBelow.diastolic;
			const caution = sys > c.cautionAbove.systolic || dia > c.cautionAbove.diastolic || sys < c.cautionBelow.systolic || dia < c.cautionBelow.diastolic;
			out.push({
				metricId: "bloodPressure",
				label: "Blood pressure",
				value: `${sys}/${dia} mmHg`,
				level: critical ? "CRITICAL" : caution ? "CAUTION" : "NOMINAL",
				limit: critical ? `CRITICAL above ${c.criticalAbove.systolic}/${c.criticalAbove.diastolic} or below ${c.criticalBelow.systolic}/${c.criticalBelow.diastolic} mmHg` : `CAUTION above ${c.cautionAbove.systolic}/${c.cautionAbove.diastolic} or below ${c.cautionBelow.systolic}/${c.cautionBelow.diastolic} mmHg`,
				outsideDeviceRange: sys > c.entry.systolic.max || sys < c.entry.systolic.min || dia > c.entry.diastolic.max || dia < c.entry.diastolic.min
			});
		}
		const temp = text.match(/(\d{2}(?:\.\d)?)\s*°?\s*c\b/i) ?? text.match(/(?:temperature|temp|fever)\D{0,20}?(\d{2}(?:\.\d)?)/i);
		if (temp) {
			const v = Number(temp[1]);
			const t = BODY_TEMPERATURE;
			if (v >= 30 && v <= 45) {
				const level = v >= t.criticalAtOrAbove ? "CRITICAL" : v >= t.cautionAtOrAbove || v < t.cautionBelow ? "CAUTION" : "NOMINAL";
				out.push({
					metricId: "bodyTemperature",
					label: "Body temperature",
					value: `${v} °C`,
					level,
					limit: level === "CRITICAL" ? `CRITICAL at or above ${t.criticalAtOrAbove} °C` : v < t.cautionBelow ? `CAUTION below ${t.cautionBelow} °C` : `CAUTION at or above ${t.cautionAtOrAbove} °C`,
					outsideDeviceRange: v > t.entry.max || v < t.entry.min
				});
			}
		}
		const glu = text.match(/(\d{2,3})\s*mg\s*\/?\s*dl/i) ?? text.match(/(?:glucose|blood sugar)\D{0,20}?(\d{2,3})/i);
		if (glu) {
			const v = Number(glu[1]);
			const g = BLOOD_GLUCOSE;
			const level = v >= g.criticalAtOrAbove || v < g.criticalBelow ? "CRITICAL" : v >= g.cautionAtOrAbove || v < g.cautionBelow ? "CAUTION" : "NOMINAL";
			out.push({
				metricId: "bloodGlucose",
				label: "Blood glucose",
				value: `${v} mg/dL`,
				level,
				limit: level === "CRITICAL" ? `CRITICAL at or above ${g.criticalAtOrAbove} or below ${g.criticalBelow} mg/dL` : `CAUTION at or above ${g.cautionAtOrAbove} or below ${g.cautionBelow} mg/dL`,
				outsideDeviceRange: v > g.entry.max || v < g.entry.min
			});
		}
		return out;
	}
	/** Fixed reply for typed readings outside their range, or null when all are in range. */
	function reportedVitalsReply(vitals) {
		const worst = vitals.find((v) => v.level === "CRITICAL") ?? vitals.find((v) => v.level === "CAUTION");
		if (!worst) return null;
		const actions = [
			{
				kind: "contact",
				priority: worst.level === "CRITICAL" ? "urgent" : "routine"
			},
			{
				kind: "log",
				metricId: worst.metricId
			},
			{
				kind: "guidance",
				metricId: worst.metricId
			}
		];
		if (worst.level === "CRITICAL") return {
			text: [
				`${worst.label} of ${worst.value} is CRITICAL in ASTRA-MED's prototype rules (${worst.limit}). That is not a good number; treat it as urgent until a repeat shows otherwise.`,
				"",
				"1. Stop what you're doing and stay still, seated or restrained.",
				`2. Repeat the measurement now with the mission-approved device.${worst.outsideDeviceRange ? " This value is beyond what the logging form accepts, so a loose sensor or movement is possible, but don't assume that." : " Movement or a loose sensor can give a false reading."}`,
				"3. If the repeat is still outside the range, or you feel chest pain, faintness, shortness of breath or a pounding heartbeat, tell a crewmate now and contact the medical officer by the urgent channel.",
				"",
				"Log the repeat so the console and the medical officer see it. Tuesday can't tell what's causing it and gives no treatment."
			].join("\n"),
			actions
		};
		return {
			text: `${worst.label} of ${worst.value} is outside the configured demonstration range (${worst.limit}). Rest for the protocol period, then repeat the measurement the same way and log it. If it stays outside the range, review the mission-approved protocol and contact the medical officer when communication is available. If you also feel unwell, tell a crewmate.`,
			actions
		};
	}
	var UNSAFE = [
		/\b(ibuprofen|acetaminophen|paracetamol|aspirin|naproxen|melatonin|modafinil|zolpidem|promethazine|diphenhydramine|antihistamine|antibiotic|steroid|opioid|benzodiazepine|sertraline|ssri)s?\b/i,
		/\b\d+(\.\d+)?\s?(mg|mcg|µg)\b/i,
		/\b(take|start|stop|increase|decrease|double)\s+(a |your |the )?(dose|medication|medicine|pills?|tablets?|drug)/i,
		/\bprescri(be|ption)/i,
		/\byou (have|are suffering from|are showing signs of|probably have|likely have)\s+(an? )?(infection|disease|disorder|syndrome|condition|cancer|depression|anxiety disorder|hypertension|arrhythmia|SANS)\b/i,
		/\b(stop|skip|cancel|reduce|increase|double)\s+(your |the )?(ared|exercise|workout|countermeasure|treatment)/i
	];
	var SAFETY_REPLACEMENT = "[Tuesday removed a sentence here: ASTRA-MED does not give diagnoses, medication or changes to exercise or treatment. Review the mission-approved protocol and contact the medical officer when communication is available.]";
	/** Remove sentences that break the medical language rules. Keeps the rest of the answer. */
	function safetyFilter(text) {
		const clean = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
		const sentences = clean.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [clean];
		let removed = 0;
		let joined = sentences.map((s) => {
			if (/\bdiagnos/i.test(s) && !/\b(not|no|never|cannot|can't|won't)\b[^.!?]{0,24}diagnos/i.test(s) || UNSAFE.some((re) => re.test(s))) {
				removed++;
				return "";
			}
			return s;
		}).join("").replace(/\n{3,}/g, "\n\n").trim();
		if (removed) joined = `${joined}${joined ? "\n\n" : ""}${SAFETY_REPLACEMENT}`;
		return {
			text: joined,
			removed
		};
	}
	function flagged(ctx) {
		return Object.values(ctx.diagnostics).filter((d) => d.status !== "NOMINAL");
	}
	/**
	* Compact plain-text summary of today's engine output. This is what a local
	* model sees. It goes only to a model on this device (localhost).
	*/
	function buildHealthBrief(ctx) {
		const lines = [`Mission day ${ctx.day}. Overall status: ${ctx.overall} (ASTRA-MED engine, prototype thresholds, synthetic data).`];
		const f = flagged(ctx);
		lines.push(f.length ? `Outside the configured demonstration range: ${f.map((d) => `${METRIC_GUIDANCE[d.metricId].name} ${d.status}: ${d.summary}`).join(" | ")}` : "All indicators inside their configured ranges.");
		const latest = Object.values(ctx.diagnostics).filter((d) => d.latest && d.metricId !== "symptoms").map((d) => `${METRIC_GUIDANCE[d.metricId].name} ${formatWithUnit(d.metricId, d.latest.value).replace(/\u00a0/g, " ")} (day ${d.latest.missionDay}, ${d.status})`);
		if (latest.length) lines.push(`Latest readings: ${latest.join("; ")}.`);
		const watch = Object.values(ctx.systems).filter((s) => s.status !== "NOMINAL").map((s) => `${BODY_SYSTEMS[s.id].name} ${s.status}`);
		if (watch.length) lines.push(`Body systems to watch: ${watch.join(", ")}.`);
		if (ctx.trends.length) lines.push(`Trend watch: ${ctx.trends.map((t) => t.text).join(" ")}`);
		if (ctx.drift.state === "drift") lines.push(`Baseline drift (Isolation Forest): ${ctx.drift.text}`);
		else if (ctx.drift.state === "steady") lines.push("Baseline drift: recent days match the personal baseline.");
		const hazard = ctx.advisories.find((a) => a.level !== "ALL CLEAR");
		if (hazard) lines.push(`Environmental hazard ${hazard.level} (not a personal dose).`);
		lines.push(`Next action from the protocol engine: ${ctx.primaryAction}`);
		if (ctx.recentEnergy !== null) lines.push(`Latest self-reported energy: ${ctx.recentEnergy}/5.`);
		lines.push(`One-way signal delay from the ship to Earth on this mission day: ${ctx.lightMinutes.toFixed(1)} minutes; a reply takes about ${(ctx.lightMinutes * 2).toFixed(0)} minutes.`);
		return lines.join("\n");
	}
	var TUESDAY_SYSTEM_PROMPT = `You are Tuesday, the on-board companion in ASTRA-MED, a prototype health console for astronauts on a long mission. You are part assistant, part friend: warm, calm, brief, a little playful, never fake-cheerful.

Rules you must follow:
- Use only the HEALTH BRIEF and the numbered PASSAGES below for health facts. Never invent mission events, locations, views or crew names. If they do not cover something, say you do not know and suggest the medical officer.
- Never diagnose. Never name or suggest medication or doses. Never tell the astronaut to stop, skip or change exercise or treatment.
- Use these phrases for health concerns: "outside the configured demonstration range", "repeat the measurement", "review the mission-approved protocol", "contact the medical officer when communication is available".
- Cite passages you use as [1], [2].
- Readings are synthetic demonstration data and thresholds are prototype values, not NASA flight rules.
- Space weather is an environmental hazard, not a personal dose.
- For boredom, tiredness, loneliness or stress: acknowledge the feeling in one sentence, then offer one small concrete thing (Earth view, a game, a breathing round, a check-in, or talking to a crewmate).
- If the astronaut mentions self-harm, tell them to tell a crewmate now and contact the medical officer by the urgent channel.
- Keep answers under 120 words. Plain English. No lists longer than 3 items.`;
	function buildModelMessages(brief, passages, history, question) {
		return [
			{
				role: "system",
				content: `${TUESDAY_SYSTEM_PROMPT}\n\nHEALTH BRIEF\n${brief}\n\nPASSAGES\n${passages.length ? passages.map((p, i) => `[${i + 1}] ${p.doc.title}: ${p.doc.text}`).join("\n") : "(no matching passage)"}`
			},
			...history.slice(-8),
			{
				role: "user",
				content: question
			}
		];
	}
	function actionsFor(intent, ctx) {
		switch (intent) {
			case "urgent": return [{
				kind: "contact",
				priority: "urgent"
			}, {
				kind: "log",
				metricId: "heartRate"
			}];
			case "symptom": return [{
				kind: "log",
				metricId: "heartRate"
			}, {
				kind: "contact",
				priority: "routine"
			}];
			case "crisis": return [{
				kind: "contact",
				priority: "urgent"
			}, { kind: "breathe" }];
			case "stressed": return [{ kind: "breathe" }, { kind: "checkin" }];
			case "bored": return [{ kind: "earth" }, { kind: "game" }];
			case "tired": return [{ kind: "breathe" }, {
				kind: "guidance",
				metricId: "sleep"
			}];
			case "low": return [{ kind: "earth" }, { kind: "checkin" }];
			case "sleep": return [{
				kind: "guidance",
				metricId: "sleep"
			}, { kind: "breathe" }];
			case "earth": return [{ kind: "earth" }];
			case "game": return [{ kind: "game" }];
			case "breathe": return [{ kind: "breathe" }];
			case "checkin": return [{ kind: "checkin" }];
			case "status": {
				const first = flagged(ctx)[0];
				return first ? [{
					kind: "guidance",
					metricId: first.metricId
				}, { kind: "report" }] : [{ kind: "report" }];
			}
			default: return [{ kind: "checkin" }, { kind: "earth" }];
		}
	}
	function statusSummary(ctx) {
		const f = flagged(ctx);
		const parts = [];
		if (f.length) parts.push(`Today you're ${ctx.overall}. ${f.map((d) => METRIC_GUIDANCE[d.metricId].name).join(", ")} ${f.length === 1 ? "is" : "are"} outside the configured demonstration range.`);
		else parts.push(`Today you're ${ctx.overall}. Every indicator is inside its configured range.`);
		if (ctx.drift.state === "drift" && ctx.drift.drivers[0]) parts.push(`Your pattern has drifted from your own baseline: ${ctx.drift.drivers[0].text}`);
		if (ctx.trends[0]) parts.push(`Trend watch: ${METRIC_GUIDANCE[ctx.trends[0].metricId].name.toLowerCase()} is ${ctx.trends[0].direction}, about ${ctx.trends[0].daysToLimit} days from its caution limit at this rate.`);
		parts.push(`Next: ${ctx.primaryAction}`);
		return parts.join(" ");
	}
	function offlineReply(intent, ctx, passages) {
		const actions = actionsFor(intent, ctx);
		const tip = passages[0] && passages[0].score >= 5 ? `${passages[0].doc.text} [1]` : "";
		const sleepTip = passages[0] && /sleep|circadian|rest/i.test(passages[0].doc.text) ? tip : "";
		return {
			text: {
				crisis: CRISIS_REPLY,
				urgent: URGENT_REPLY,
				symptom: "Thanks for telling me. What's the reading, or how do you feel? Take the measurement with the mission-approved device, log it, and I'll check it against your ranges and your own baseline. If you feel chest pain, faintness or shortness of breath, tell a crewmate now and contact the medical officer by the urgent channel.",
				status: statusSummary(ctx),
				bored: "Long stretches of the same routine wear anyone down; monotony is a real stressor up here. Want five minutes over Earth, or a quick round of Orbit Catch?",
				tired: `That sounds draining. ${ctx.diagnostics.sleep.latest && typeof ctx.diagnostics.sleep.latest.value === "number" ? `Your last logged sleep was ${ctx.diagnostics.sleep.latest.value} h. ` : ""}Keep the planned sleep period tonight, and avoid starting safety-critical work while very tired. A slow breathing round might help you reset now.`,
				low: "I hear you. Being this far from home is hard, and the signal delay makes it harder. Want to look at Earth together for a few minutes? If the feeling sticks around, talk to a crewmate or the behavioural-health contact.",
				stressed: "Okay. Let's slow things down for a minute. One breathing round: in for 4, out for 6. Then, if you want, tell me what's on your mind.",
				sleep: sleepTip || `${ctx.diagnostics.sleep.latest && typeof ctx.diagnostics.sleep.latest.value === "number" ? `Your last logged sleep was ${ctx.diagnostics.sleep.latest.value} hours. ` : ""}Keep the planned sleep period, dim the lights and screens in the hour before it, and log your sleep the same way each day. If short sleep continues, note it for the medical officer.`,
				earth: "Opening the Earth view. The globe uses NASA imagery of Earth from yesterday, lit for the real time of day.",
				game: "Orbit Catch is ready: pinch or click the supply pods before they drift away. One minute, no pressure.",
				breathe: "One minute of paced breathing: in for 4 seconds, out for 6. Open your hand to breathe in and close it to breathe out, or just follow the ring.",
				checkin: "Quick check-in: how's your mood and energy right now?",
				greeting: `Hey. ${ctx.overall === "NOMINAL" ? "Your readings look settled today." : `You're ${ctx.overall} today, so let's keep an eye on that.`} How are you feeling?`,
				thanks: "Anytime. I'm here.",
				help: "I can explain your readings, track your mood and energy, spot when your pattern drifts from your own baseline, and help you recharge with an Earth view, a game or a breathing round. With a local model running I can also read a photo or a lab report on this device.",
				other: tip ? `Here's what the onboard guidance says: ${tip}` : "I don't have that in my onboard library. I can tell you how you're doing, log a reading, or explain any of your readings. If it's about your health, review the mission-approved protocol and contact the medical officer when communication is available."
			}[intent],
			actions
		};
	}
	// src/services/chartSeries.ts
	function windowRange(day, window, total) {
		if (window >= total) return [1, total];
		const end = Math.max(day, window);
		return [Math.max(1, end - window + 1), Math.min(total, end)];
	}
	function numeric(days, d, metric) {
		const r = days[d - 1]?.readings[metric];
		return r && typeof r.value === "number" ? r.value : null;
	}
	function isManual(days, d, metric) {
		const r = days[d - 1]?.readings[metric];
		return Boolean(r && r.source !== "synthetic" && r.source !== "tuesday");
	}
	function isTuesday(days, d, metric) {
		return days[d - 1]?.readings[metric]?.source === "tuesday";
	}
	/** Rows for the visible window. Days after the selected day have no values (replay stops at "today"). */
	function buildChartRows(days, selectedDay, range) {
		const rows = [];
		for (let d = range[0]; d <= range[1]; d++) {
			const past = d <= selectedDay;
			const bp = days[d - 1]?.readings.bloodPressure;
			const bpv = bp && isBloodPressure(bp.value) ? bp.value : null;
			const get = (m) => past ? numeric(days, d, m) : null;
			const manual = (m, v) => past && isManual(days, d, m) ? v : null;
			const tuesday = (m, v) => past && isTuesday(days, d, m) ? v : null;
			const hr = get("heartRate");
			const glucose = get("bloodGlucose");
			const temp = get("bodyTemperature");
			const sleep = get("sleep");
			const mood = get("mood");
			const ared = get("aredMinutes");
			const cumulative = get("radiation");
			const pvt = get("pvt");
			const hydration = get("hydration");
			const daily = past ? days[d - 1]?.dailyRadiationMsv ?? null : null;
			rows.push({
				day: d,
				heartRate: hr,
				heartRateManual: manual("heartRate", hr),
				heartRateTuesday: tuesday("heartRate", hr),
				systolic: past && bpv ? bpv.systolic : null,
				diastolic: past && bpv ? bpv.diastolic : null,
				systolicManual: past && bpv && isManual(days, d, "bloodPressure") ? bpv.systolic : null,
				diastolicManual: past && bpv && isManual(days, d, "bloodPressure") ? bpv.diastolic : null,
				systolicTuesday: past && bpv && isTuesday(days, d, "bloodPressure") ? bpv.systolic : null,
				diastolicTuesday: past && bpv && isTuesday(days, d, "bloodPressure") ? bpv.diastolic : null,
				bloodGlucose: glucose,
				bloodGlucoseManual: manual("bloodGlucose", glucose),
				bloodGlucoseTuesday: tuesday("bloodGlucose", glucose),
				bodyTemperature: temp,
				bodyTemperatureManual: manual("bodyTemperature", temp),
				bodyTemperatureTuesday: tuesday("bodyTemperature", temp),
				sleep,
				sleepManual: manual("sleep", sleep),
				sleepTuesday: tuesday("sleep", sleep),
				mood,
				moodManual: manual("mood", mood),
				moodTuesday: tuesday("mood", mood),
				aredMinutes: ared,
				aredManual: manual("aredMinutes", ared),
				aredTuesday: tuesday("aredMinutes", ared),
				dailyDose: daily,
				cumulativeDose: cumulative,
				cumulativeManual: manual("radiation", cumulative),
				cumulativeTuesday: tuesday("radiation", cumulative),
				pvt,
				pvtManual: manual("pvt", pvt),
				pvtTuesday: tuesday("pvt", pvt),
				hydration,
				hydrationManual: manual("hydration", hydration),
				hydrationTuesday: tuesday("hydration", hydration)
			});
		}
		return rows;
	}
	// src/services/storageService.ts
	/**
	* Versioned, validated localStorage access.
	*
	* - Every key is namespaced and versioned (`astra-med:v1:*`).
	* - Reads parse safely and validate; malformed data falls back to defaults.
	* - If storage is unavailable (private mode, quota, policy), the app keeps
	*   working in memory and reports that changes will not survive a reload.
	*
	* localStorage is not encrypted and is not suitable for regulated medical
	* records. Clearing browser data removes everything saved here.
	*/
	var STORAGE_KEYS = {
		measurements: "astra-med:v1:measurements",
		countermeasures: "astra-med:v1:countermeasures",
		followUps: "astra-med:v1:readiness",
		settings: "astra-med:v1:mission-settings",
		donkiCache: "astra-med:v1:donki-cache",
		enlilCache: "astra-med:v1:enlil-cache",
		onboarding: "astra-med:v1:onboarding",
		tuesday: "astra-med:v1:tuesday",
		autoSync: "astra-med:v1:auto-sync"
	};
	function probe(backend) {
		if (!backend) return false;
		try {
			const k = "astra-med:probe";
			backend.setItem(k, "1");
			backend.removeItem(k);
			return true;
		} catch {
			return false;
		}
	}
	function defaultBackend() {
		try {
			return typeof window !== "undefined" ? window.localStorage : void 0;
		} catch {
			return;
		}
	}
	function createStorageService(backend = defaultBackend()) {
		const available = probe(backend);
		return {
			available,
			read(key, sanitize, fallback) {
				if (!available || !backend) return {
					value: fallback,
					status: "unavailable"
				};
				let text;
				try {
					text = backend.getItem(key);
				} catch {
					return {
						value: fallback,
						status: "unavailable"
					};
				}
				if (text === null) return {
					value: fallback,
					status: "missing"
				};
				try {
					const clean = sanitize(JSON.parse(text));
					return clean === null ? {
						value: fallback,
						status: "corrupt"
					} : {
						value: clean,
						status: "ok"
					};
				} catch {
					return {
						value: fallback,
						status: "corrupt"
					};
				}
			},
			write(key, value) {
				if (!available || !backend) return false;
				try {
					backend.setItem(key, JSON.stringify(value));
					return true;
				} catch {
					return false;
				}
			},
			remove(key) {
				if (!available || !backend) return false;
				try {
					backend.removeItem(key);
					return true;
				} catch {
					return false;
				}
			}
		};
	}
	// src/data/missionTelemetry.ts
	/**
	* Deterministic synthetic 180-day mission telemetry.
	*
	* SYNTHETIC DEMONSTRATION DATA. Nothing here is real astronaut telemetry.
	* The generator uses fixed seeds, so every load produces the same mission.
	*
	* Modelling choices (plausible shape, not a physiological model):
	* - Early adaptation over the first ~2 weeks, then small smooth (AR(1)) variation.
	* - Short sleep nudges heart rate, glucose, PVT and mood in the expected direction.
	* - Daily dose sits near the GCR dose-equivalent rate MSL/RAD measured during its
	*   Mars cruise (order of 1.8 mSv/day; Zeitlin et al., Science 340, 2013), with a
	*   27-day modulation. Cumulative dose is the running sum, so it never decreases.
	*/
	var DAYS = MISSION.totalDays;
	function stream(name) {
		return mulberry32(hashSeed(`astra-med:${name}`));
	}
	function baseSeries() {
		return {
			hrNoise: ar1Series(stream("hr"), DAYS, .6, 1.5),
			sysNoise: ar1Series(stream("sys"), DAYS, .5, 2.8),
			diaNoise: ar1Series(stream("dia"), DAYS, .5, 1.8),
			glucoseNoise: ar1Series(stream("glu"), DAYS, .35, 3.6),
			tempNoise: ar1Series(stream("temp"), DAYS, .6, .08),
			sleepNoise: ar1Series(stream("sleep"), DAYS, .3, .32),
			moodNoise: ar1Series(stream("mood"), DAYS, .55, .18),
			doseNoise: ar1Series(stream("dose"), DAYS, .4, .035),
			pvtNoise: ar1Series(stream("pvt"), DAYS, .4, 7),
			hydrationNoise: ar1Series(stream("hyd"), DAYS, .3, .16),
			aredRoll: Array.from({ length: DAYS }, stream("ared")),
			minuteRoll: Array.from({ length: DAYS }, stream("minute"))
		};
	}
	/** Fixed base anomalies shared by every scenario. */
	var SLEEP_OVERRIDES = {
		27: 5.4,
		28: 5.6
	};
	var ARED_OVERRIDES = {
		51: 25,
		88: 45,
		141: 0
	};
	var GLUCOSE_OVERRIDES = { 63: 113 };
	/** Scenario B: cardiovascular drift envelope (0..1). */
	function cardiovascularDrift(day) {
		return smoothstep(96, 116, day) * (1 - .75 * smoothstep(126, 146, day));
	}
	/** Scenario C overlay: documented model in src/data/scenarioHazards.ts. */
	var SEP_EXTRA_DOSE = SEP_SCENARIO.dosimeterOverlayMsv;
	var SEP_SLEEP = SEP_SCENARIO.sleepOverrideHours;
	function generate(scenarioId) {
		const s = baseSeries();
		const out = [];
		let cumulative = 0;
		for (let i = 0; i < DAYS; i++) {
			const day = i + 1;
			const adapt = 1 - Math.exp(-day / 12);
			let sleep = clamp(6.55 + (s.sleepNoise[i] ?? 0), 5, 8);
			if (SLEEP_OVERRIDES[day] !== void 0) sleep = SLEEP_OVERRIDES[day];
			if (scenarioId === "sep" && SEP_SLEEP[day] !== void 0) sleep = SEP_SLEEP[day];
			if (SLEEP_OVERRIDES[day] === void 0 && !(scenarioId === "sep" && SEP_SLEEP[day] !== void 0)) sleep = Math.max(sleep, 6);
			sleep = roundTo(sleep, .1);
			const deficit = Math.max(0, 6.5 - sleep);
			const cv = scenarioId === "cardiovascular" ? cardiovascularDrift(day) : 0;
			const heartRate = Math.round(60.5 - 2.5 * adapt + (s.hrNoise[i] ?? 0) + 1.6 * deficit + 31.5 * cv);
			const systolic = Math.round(117 - 5 * adapt + (s.sysNoise[i] ?? 0) + 27 * cv);
			const diastolic = Math.round(75 - 3 * adapt + .35 * (s.sysNoise[i] ?? 0) + (s.diaNoise[i] ?? 0) + 15.5 * cv);
			let glucose = Math.round(clamp(88 + (s.glucoseNoise[i] ?? 0) + 2.2 * deficit, 76, 104));
			if (GLUCOSE_OVERRIDES[day] !== void 0) glucose = GLUCOSE_OVERRIDES[day];
			const temperature = roundTo(clamp(36.85 + .22 * Math.min(1, day / 90) + (s.tempNoise[i] ?? 0), 36.6, 37.4), .1);
			const moodScore = roundTo(clamp(4.25 - .28 * Math.exp(-(((day - 112) / 16) ** 2)) + (s.moodNoise[i] ?? 0) - .35 * deficit, 3.5, 5), .1);
			const roll = s.aredRoll[i] ?? .5;
			let aredMinutes = roll < .86 ? 60 : roll < .98 ? 65 : 55;
			if (ARED_OVERRIDES[day] !== void 0) aredMinutes = ARED_OVERRIDES[day];
			let dailyDose = roundTo(1.8 + .05 * Math.sin(2 * Math.PI * day / 27) + (s.doseNoise[i] ?? 0), .01);
			if (scenarioId === "sep" && SEP_EXTRA_DOSE[day] !== void 0) dailyDose = roundTo(dailyDose + SEP_EXTRA_DOSE[day], .01);
			cumulative = roundTo(cumulative + dailyDose, .01);
			const pvtMeanMs = day % 3 === 1 ? Math.round(246 + (s.pvtNoise[i] ?? 0) + 14 * deficit) : null;
			const hydrationLiters = roundTo(clamp(2.45 + (s.hydrationNoise[i] ?? 0), 2.05, 3.1), .1);
			const symptoms = day % 7 === 0 || day === 1 ? {
				blurredVision: false,
				headache: false,
				eyePressure: false,
				otherSymptom: false
			} : null;
			out.push({
				missionDay: day,
				heartRate,
				systolic,
				diastolic,
				glucose,
				temperature,
				sleepHours: sleep,
				moodScore,
				aredMinutes,
				dailyRadiationMsv: dailyDose,
				cumulativeRadiationMsv: cumulative,
				pvtMeanMs,
				hydrationLiters,
				symptoms,
				vitalsMinuteOfDay: 400 + Math.floor((s.minuteRoll[i] ?? 0) * 35)
			});
		}
		return out;
	}
	var cache = /* @__PURE__ */ new Map();
	/** Bundled synthetic telemetry for a scenario. Cached; never depends on storage or network. */
	function getMissionTelemetry(scenarioId) {
		let data = cache.get(scenarioId);
		if (!data) {
			data = Object.freeze(generate(scenarioId));
			cache.set(scenarioId, data);
		}
		return data;
	}
	// src/services/telemetryService.ts
	/**
	* Merges bundled synthetic telemetry with locally logged manual measurements.
	* Manual entries never overwrite history: every entry is kept in the log, and
	* the latest entry for a metric on a day becomes that day's effective reading.
	*/
	function syntheticReadings(t) {
		const day = t.missionDay;
		const at = (minute) => missionDayToIso(day, minute);
		const vitals = at(t.vitalsMinuteOfDay);
		const base = {
			missionDay: day,
			source: "synthetic"
		};
		const readings = {
			heartRate: {
				...base,
				metricId: "heartRate",
				value: t.heartRate,
				recordedAt: vitals
			},
			bloodPressure: {
				...base,
				metricId: "bloodPressure",
				value: {
					systolic: t.systolic,
					diastolic: t.diastolic
				},
				recordedAt: vitals
			},
			bloodGlucose: {
				...base,
				metricId: "bloodGlucose",
				value: t.glucose,
				recordedAt: at(t.vitalsMinuteOfDay + (day === 63 ? 330 : 8)),
				glucoseContext: day === 63 ? "post-meal" : "fasting",
				...day === 63 ? { notes: "Synthetic reading taken after a meal." } : {}
			},
			bodyTemperature: {
				...base,
				metricId: "bodyTemperature",
				value: t.temperature,
				recordedAt: vitals
			},
			sleep: {
				...base,
				metricId: "sleep",
				value: t.sleepHours,
				recordedAt: at(t.vitalsMinuteOfDay - 20)
			},
			mood: {
				...base,
				metricId: "mood",
				value: t.moodScore,
				recordedAt: at(1230)
			},
			aredMinutes: {
				...base,
				metricId: "aredMinutes",
				value: t.aredMinutes,
				recordedAt: at(855)
			},
			radiation: {
				...base,
				metricId: "radiation",
				value: t.cumulativeRadiationMsv,
				recordedAt: at(1430)
			},
			hydration: {
				...base,
				metricId: "hydration",
				value: t.hydrationLiters,
				recordedAt: at(1270)
			}
		};
		if (t.pvtMeanMs !== null) readings.pvt = {
			...base,
			metricId: "pvt",
			value: t.pvtMeanMs,
			recordedAt: at(665)
		};
		if (t.symptoms !== null) readings.symptoms = {
			...base,
			metricId: "symptoms",
			value: t.symptoms,
			recordedAt: at(t.vitalsMinuteOfDay + 15)
		};
		return readings;
	}
	function toReading(m) {
		return {
			metricId: m.metricId,
			missionDay: m.missionDay,
			value: m.value,
			recordedAt: m.recordedAt,
			source: m.source,
			measurementId: m.id,
			...m.notes ? { notes: m.notes } : {},
			...m.glucoseContext ? { glucoseContext: m.glucoseContext } : {}
		};
	}
	/** Latest manual measurement per (day, metric). */
	function latestManualByDay(measurements) {
		const map = /* @__PURE__ */ new Map();
		for (const m of measurements) {
			const key = `${m.missionDay}:${m.metricId}`;
			const prev = map.get(key);
			if (!prev || Date.parse(m.recordedAt) >= Date.parse(prev.recordedAt)) map.set(key, m);
		}
		return map;
	}
	/**
	* Effective readings for all mission days.
	* Radiation: a manual dosimeter reading rebases the cumulative series from that
	* day forward, so the curve stays continuous and never decreases.
	*/
	function buildEffectiveDays(scenarioId, measurements) {
		const telemetry = getMissionTelemetry(scenarioId);
		const manual = latestManualByDay(measurements);
		const days = [];
		let offset = 0;
		let prevCumulative = 0;
		for (const t of telemetry) {
			const readings = syntheticReadings(t);
			for (const metricId of Object.keys(readings)) {
				const m = manual.get(`${t.missionDay}:${metricId}`);
				if (m && metricId !== "radiation") readings[metricId] = toReading(m);
			}
			for (const metricId of ["pvt", "symptoms"]) {
				const m = manual.get(`${t.missionDay}:${metricId}`);
				if (m) readings[metricId] = toReading(m);
			}
			const manualDose = manual.get(`${t.missionDay}:radiation`);
			let cumulative = roundTo(t.cumulativeRadiationMsv + offset, .01);
			if (manualDose && typeof manualDose.value === "number") {
				offset = manualDose.value - t.cumulativeRadiationMsv;
				cumulative = manualDose.value;
				readings.radiation = toReading(manualDose);
			}
			cumulative = Math.max(cumulative, prevCumulative);
			if (!manualDose && readings.radiation) readings.radiation = {
				...readings.radiation,
				value: cumulative
			};
			const daily = roundTo(cumulative - prevCumulative, .01);
			prevCumulative = cumulative;
			days.push({
				missionDay: t.missionDay,
				readings,
				dailyRadiationMsv: daily
			});
		}
		return days;
	}
	/** Effective cumulative dose at the end of a day (0 before day 1). */
	function cumulativeDoseAt(days, day) {
		if (day < 1) return 0;
		const r = days[Math.min(day, MISSION.totalDays) - 1]?.readings.radiation;
		return r && typeof r.value === "number" ? r.value : 0;
	}
	// src/state/missionStore.ts
	/**
	* Framework-free mission store.
	*
	* Every action validates, writes to storage synchronously, then notifies
	* subscribers. Actions return whether the change was persisted so the UI only
	* reports success after the local state change has completed.
	*/
	var DEFAULT_SETTINGS = {
		scenarioId: "nominal",
		selectedDay: MISSION.defaultDay,
		aredTargetMinutes: ARED.defaultTargetMinutes,
		hydrationTargetLiters: HYDRATION.defaultTargetLiters,
		radiationLimitMsv: RADIATION.limit.default,
		pvtMinMs: PVT.range.min,
		pvtMaxMs: PVT.range.max,
		trendWindow: 30,
		trendTab: "heartRate"
	};
	function newId$1() {
		try {
			return crypto.randomUUID();
		} catch {
			return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		}
	}
	function createMissionStore(storage = createStorageService()) {
		const recovered = [];
		const m = storage.read(STORAGE_KEYS.measurements, sanitizeMeasurements, []);
		const c = storage.read(STORAGE_KEYS.countermeasures, sanitizeCompletions, {});
		const f = storage.read(STORAGE_KEYS.followUps, sanitizeFollowUps, {});
		const s = storage.read(STORAGE_KEYS.settings, (raw) => sanitizeSettings(raw, DEFAULT_SETTINGS), DEFAULT_SETTINGS);
		const migrationSaved = !(m.status === "ok" && m.value.some((measurement) => measurement.source === "tuesday")) || storage.write(STORAGE_KEYS.measurements, m.value);
		for (const [key, r] of [
			[STORAGE_KEYS.measurements, m],
			[STORAGE_KEYS.countermeasures, c],
			[STORAGE_KEYS.followUps, f],
			[STORAGE_KEYS.settings, s]
		]) if (r.status === "corrupt") {
			recovered.push(key);
			storage.remove(key);
		}
		let state = {
			measurements: m.value,
			completions: c.value,
			followUps: f.value,
			settings: s.value,
			storage: {
				available: storage.available,
				recoveredKeys: recovered,
				lastWriteOk: migrationSaved
			}
		};
		const listeners = /* @__PURE__ */ new Set();
		function commit(next) {
			let ok = true;
			if (next.measurements) ok = storage.write(STORAGE_KEYS.measurements, next.measurements) && ok;
			if (next.completions) ok = storage.write(STORAGE_KEYS.countermeasures, next.completions) && ok;
			if (next.followUps) ok = storage.write(STORAGE_KEYS.followUps, next.followUps) && ok;
			if (next.settings) ok = storage.write(STORAGE_KEYS.settings, next.settings) && ok;
			state = {
				...state,
				...next,
				storage: {
					...state.storage,
					lastWriteOk: ok
				}
			};
			listeners.forEach((l) => l());
			return ok;
		}
		const saved = (persisted, message) => ({
			ok: true,
			persisted,
			message: persisted ? message : `${message} Not saved to this browser: storage is unavailable, so it will be lost on reload.`
		});
		function setTaskRecord(day, taskId, completed, via) {
			const dayRecords = { ...state.completions[day] ?? {} };
			dayRecords[taskId] = {
				taskId,
				missionDay: day,
				completed,
				via,
				...completed ? { completedAt: (/* @__PURE__ */ new Date()).toISOString() } : {}
			};
			return {
				...state.completions,
				[day]: dayRecords
			};
		}
		return {
			getState: () => state,
			subscribe(listener) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
			setSelectedDay(day) {
				const selectedDay = clampDay(day);
				if (selectedDay === state.settings.selectedDay) return;
				commit({ settings: {
					...state.settings,
					selectedDay
				} });
			},
			/** Switches scenario and jumps to its focus day. Logged measurements and task records are kept. */
			setScenario(scenarioId) {
				const focusDay = SCENARIOS[scenarioId].focusDay;
				const persisted = commit({ settings: {
					...state.settings,
					scenarioId,
					selectedDay: focusDay
				} });
				return saved(persisted, `Scenario ${SCENARIOS[scenarioId].code} loaded: ${SCENARIOS[scenarioId].name}. Showing mission day ${focusDay}.`);
			},
			setTrendWindow(trendWindow) {
				commit({ settings: {
					...state.settings,
					trendWindow
				} });
			},
			setTrendTab(trendTab) {
				commit({ settings: {
					...state.settings,
					trendTab
				} });
			},
			/** Slider limits from the Thresholds screen. Values are clamped to their slider bounds. */
			updateLimits(patch) {
				const persisted = commit({ settings: sanitizeSettings({
					...state.settings,
					...patch
				}, DEFAULT_SETTINGS) ?? state.settings });
				return saved(persisted, "Limits saved.");
			},
			updatePlanTargets(aredTargetMinutes, hydrationTargetLiters) {
				const persisted = commit({ settings: {
					...state.settings,
					aredTargetMinutes,
					hydrationTargetLiters
				} });
				return saved(persisted, "Mission plan targets saved.");
			},
			logMeasurement(input) {
				const measurement = {
					id: newId$1(),
					metricId: input.metricId,
					value: input.value,
					unit: METRIC_UNITS[input.metricId],
					missionDay: input.missionDay,
					recordedAt: input.recordedAt,
					enteredAt: (/* @__PURE__ */ new Date()).toISOString(),
					source: input.source ?? "manual",
					...input.notes ? { notes: input.notes } : {},
					...input.glucoseContext ? { glucoseContext: input.glucoseContext } : {}
				};
				const measurements = [...state.measurements, measurement];
				const task = getCountermeasureTasks(state.settings.aredTargetMinutes, state.settings.hydrationTargetLiters).find((t) => t.linkedMetric === input.metricId);
				let completions;
				let completedTaskTitle;
				const meetsTarget = input.metricId === "aredMinutes" ? typeof input.value === "number" && input.value >= state.settings.aredTargetMinutes : input.metricId === "hydration" ? typeof input.value === "number" && input.value >= state.settings.hydrationTargetLiters : true;
				if (task && meetsTarget && !input.linkedTaskComplete && !state.completions[input.missionDay]?.[task.id]?.completed) {
					completions = setTaskRecord(input.missionDay, task.id, true, "measurement");
					completedTaskTitle = task.title;
				}
				const persisted = commit({
					measurements,
					...completions ? { completions } : {}
				});
				return {
					...saved(persisted, `Measurement saved for mission day ${input.missionDay}.`),
					measurement,
					...completedTaskTitle ? { completedTaskTitle } : {}
				};
			},
			deleteMeasurement(id) {
				const measurements = state.measurements.filter((x) => x.id !== id);
				if (measurements.length === state.measurements.length) return {
					ok: false,
					persisted: false,
					message: "That entry no longer exists."
				};
				const persisted = commit({ measurements });
				return saved(persisted, "Entry removed. The day now uses the previous reading.");
			},
			setTaskCompletion(day, taskId, completed) {
				const persisted = commit({ completions: setTaskRecord(day, taskId, completed, "checkbox") });
				return saved(persisted, completed ? "Task marked complete." : "Task marked not complete.");
			},
			setFollowUpCompletion(day, id, completed) {
				const dayLog = { ...state.followUps[day] ?? {} };
				if (completed) dayLog[id] = (/* @__PURE__ */ new Date()).toISOString();
				else delete dayLog[id];
				const persisted = commit({ followUps: {
					...state.followUps,
					[day]: dayLog
				} });
				return saved(persisted, completed ? "Follow-up recorded as done." : "Follow-up reopened.");
			},
			/** Restores the bundled baseline. Removes every logged measurement, task record and setting. */
			resetDemoData() {
				const ok = [
					STORAGE_KEYS.measurements,
					STORAGE_KEYS.countermeasures,
					STORAGE_KEYS.followUps,
					STORAGE_KEYS.settings
				].map((k) => storage.remove(k)).every(Boolean);
				state = {
					measurements: [],
					completions: {},
					followUps: {},
					settings: DEFAULT_SETTINGS,
					storage: {
						...state.storage,
						recoveredKeys: [],
						lastWriteOk: ok || !storage.available
					}
				};
				listeners.forEach((l) => l());
				return saved(ok, "Demo data reset to the bundled baseline.");
			},
			/** Reload from storage, e.g. after another tab changed it. */
			reloadFromStorage() {
				state = {
					...state,
					measurements: storage.read(STORAGE_KEYS.measurements, sanitizeMeasurements, state.measurements).value,
					completions: storage.read(STORAGE_KEYS.countermeasures, sanitizeCompletions, state.completions).value,
					followUps: storage.read(STORAGE_KEYS.followUps, sanitizeFollowUps, state.followUps).value,
					settings: storage.read(STORAGE_KEYS.settings, (raw) => sanitizeSettings(raw, DEFAULT_SETTINGS), state.settings).value
				};
				listeners.forEach((l) => l());
			}
		};
	}
	// src/services/localModel.ts
	/**
	* Client for a language model running on this device through Ollama
	* (https://ollama.com). Tuesday sends the health brief, retrieved passages and
	* images only to a localhost endpoint; any other host is refused before a
	* request is made. Nothing here throws into the UI: failures return null or
	* an error message.
	*/
	var DEFAULT_ENDPOINT = "http://localhost:11434";
	/** Only the loopback interface counts as on-device. */
	function isLocalEndpoint(url) {
		try {
			const u = new URL(url);
			if (u.protocol !== "http:" && u.protocol !== "https:") return false;
			const h = u.hostname.toLowerCase();
			return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || h.endsWith(".localhost");
		} catch {
			return false;
		}
	}
	// src/state/tuesdayStore.ts
	var DEFAULT_TUESDAY = {
		settings: {
			endpoint: DEFAULT_ENDPOINT,
			useModel: true,
			chatModel: null,
			medicalModel: null,
			voice: false,
			hands: 1,
			handIntroSeen: false
		},
		messages: [],
		activity: [],
		bestScore: 0,
		outbox: []
	};
	var isRecord = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
	var s = (x, max = 4e3) => typeof x === "string" ? x.slice(0, max) : void 0;
	var n = (x, min, max) => typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? x : void 0;
	var iso = (x) => typeof x === "string" && !Number.isNaN(Date.parse(x)) ? x : void 0;
	var ACTION_KINDS = /* @__PURE__ */ new Set([
		"earth",
		"game",
		"breathe",
		"checkin",
		"guidance",
		"log",
		"report",
		"contact"
	]);
	var KINDS = /* @__PURE__ */ new Set([
		"checkin",
		"earth",
		"game",
		"breathe"
	]);
	function sanitizeAction(x) {
		if (!isRecord(x) || typeof x.kind !== "string" || !ACTION_KINDS.has(x.kind)) return null;
		if (x.kind === "contact") return {
			kind: "contact",
			priority: x.priority === "urgent" ? "urgent" : "routine"
		};
		if (x.kind === "guidance" || x.kind === "log") return typeof x.metricId === "string" && ALL_METRIC_IDS.includes(x.metricId) ? {
			kind: x.kind,
			metricId: x.metricId
		} : null;
		return { kind: x.kind };
	}
	function sanitizeMessage(x) {
		if (!isRecord(x)) return null;
		const id = s(x.id, 80);
		const text = s(x.text);
		const at = iso(x.at);
		if (!id || text === void 0 || !at || x.role !== "user" && x.role !== "tuesday" && x.role !== "officer") return null;
		const m = {
			id,
			role: x.role,
			text,
			at
		};
		if (x.via === "core" || x.via === "model") m.via = x.via;
		const model = s(x.model, 120);
		if (model) m.model = model;
		if (Array.isArray(x.sources)) m.sources = x.sources.filter(isRecord).map((r) => ({
			label: s(r.label, 200) ?? "",
			url: s(r.url, 400) ?? ""
		})).filter((r) => r.label && /^https:\/\//.test(r.url)).slice(0, 6);
		if (Array.isArray(x.actions)) m.actions = x.actions.map(sanitizeAction).filter((a) => a !== null).slice(0, 4);
		if (x.attachment === "photo" || x.attachment === "lab") m.attachment = x.attachment;
		const filtered = n(x.filtered, 0, 99);
		if (filtered) m.filtered = filtered;
		return m;
	}
	function sanitizeActivity(x) {
		if (!isRecord(x)) return null;
		const id = s(x.id, 80);
		const at = iso(x.at);
		const missionDay = n(x.missionDay, 1, 1e4);
		if (!id || !at || missionDay === void 0 || typeof x.kind !== "string" || !KINDS.has(x.kind)) return null;
		const e = {
			id,
			at,
			missionDay,
			kind: x.kind
		};
		const minutes = n(x.minutes, 0, 600);
		const score = n(x.score, 0, 1e6);
		const mood = n(x.mood, 1, 5);
		const energy = n(x.energy, 1, 5);
		const after = n(x.after, 1, 5);
		if (minutes !== void 0) e.minutes = minutes;
		if (score !== void 0) e.score = score;
		if (mood !== void 0) e.mood = mood;
		if (energy !== void 0) e.energy = energy;
		if (after !== void 0) e.after = after;
		return e;
	}
	function sanitizeOutbox(x) {
		if (!isRecord(x)) return null;
		const id = s(x.id, 80);
		const createdAt = iso(x.createdAt);
		const missionDay = n(x.missionDay, 1, 1e4);
		const text = s(x.text, 8e3);
		if (!id || !createdAt || missionDay === void 0 || !text || x.priority !== "urgent" && x.priority !== "routine") return null;
		return {
			id,
			createdAt,
			missionDay,
			priority: x.priority,
			text,
			...x.reviewed === true ? { reviewed: true } : {}
		};
	}
	function sanitizeTuesday(raw) {
		if (!isRecord(raw)) return null;
		const st = isRecord(raw.settings) ? raw.settings : {};
		const endpoint = s(st.endpoint, 200);
		return {
			settings: {
				endpoint: endpoint && isLocalEndpoint(endpoint) ? endpoint : DEFAULT_ENDPOINT,
				useModel: typeof st.useModel === "boolean" ? st.useModel : DEFAULT_TUESDAY.settings.useModel,
				chatModel: s(st.chatModel, 120) ?? null,
				medicalModel: s(st.medicalModel, 120) ?? null,
				voice: st.voice === true,
				hands: st.hands === 2 ? 2 : 1,
				handIntroSeen: st.handIntroSeen === true
			},
			messages: Array.isArray(raw.messages) ? raw.messages.map(sanitizeMessage).filter((m) => m !== null).slice(-60) : [],
			activity: Array.isArray(raw.activity) ? raw.activity.map(sanitizeActivity).filter((a) => a !== null).slice(-300) : [],
			bestScore: n(raw.bestScore, 0, 1e6) ?? 0,
			outbox: Array.isArray(raw.outbox) ? raw.outbox.map(sanitizeOutbox).filter((m) => m !== null).slice(-20) : []
		};
	}
	function newId() {
		try {
			return crypto.randomUUID();
		} catch {
			return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		}
	}
	function createTuesdayStore(storage = createStorageService()) {
		let state = storage.read(STORAGE_KEYS.tuesday, sanitizeTuesday, DEFAULT_TUESDAY).value;
		let persisted = storage.available;
		const listeners = /* @__PURE__ */ new Set();
		function commit(next) {
			state = next;
			persisted = storage.write(STORAGE_KEYS.tuesday, next);
			listeners.forEach((l) => l());
			return persisted;
		}
		return {
			getState: () => state,
			isPersisted: () => persisted,
			subscribe(l) {
				listeners.add(l);
				return () => listeners.delete(l);
			},
			updateSettings(patch) {
				const settings = {
					...state.settings,
					...patch
				};
				if (!isLocalEndpoint(settings.endpoint)) settings.endpoint = state.settings.endpoint;
				return commit({
					...state,
					settings
				});
			},
			addMessage(m) {
				const msg = {
					...m,
					id: newId(),
					at: (/* @__PURE__ */ new Date()).toISOString()
				};
				commit({
					...state,
					messages: [...state.messages, msg].slice(-60)
				});
				return msg;
			},
			updateMessage(id, patch, persist = true) {
				const messages = state.messages.map((m) => m.id === id ? {
					...m,
					...patch
				} : m);
				if (persist) commit({
					...state,
					messages
				});
				else {
					state = {
						...state,
						messages
					};
					listeners.forEach((l) => l());
				}
			},
			clearConversation() {
				return commit({
					...state,
					messages: []
				});
			},
			/** `countsForBest` marks an Orbit Catch round; other games keep their own scoring. */
			logActivity(e, countsForBest = e.kind === "game") {
				const entry = {
					...e,
					id: newId(),
					at: (/* @__PURE__ */ new Date()).toISOString()
				};
				const bestScore = countsForBest && e.score !== void 0 ? Math.max(state.bestScore, e.score) : state.bestScore;
				return {
					entry,
					persisted: commit({
						...state,
						activity: [...state.activity, entry].slice(-300),
						bestScore
					})
				};
			},
			queueMessage(m) {
				return commit({
					...state,
					outbox: [...state.outbox, {
						...m,
						id: newId(),
						createdAt: (/* @__PURE__ */ new Date()).toISOString()
					}].slice(-20)
				});
			},
			markReviewed(id, reviewed = true) {
				return commit({
					...state,
					outbox: state.outbox.map((m) => m.id === id ? {
						...m,
						reviewed
					} : m)
				});
			},
			removeQueued(id) {
				return commit({
					...state,
					outbox: state.outbox.filter((m) => m.id !== id)
				});
			},
			rateActivity(id, after) {
				return commit({
					...state,
					activity: state.activity.map((a) => a.id === id ? {
						...a,
						after
					} : a)
				});
			}
		};
	}
	/** Last seven mission days of Tuesday activity ending on `day`. */
	function wellbeingSummary(activity, day) {
		const recent = activity.filter((a) => a.missionDay > day - 7 && a.missionDay <= day);
		const checks = recent.filter((a) => a.kind === "checkin");
		const energies = checks.map((a) => a.energy).filter((v) => v !== void 0);
		const sessions = recent.filter((a) => a.kind !== "checkin");
		const afters = sessions.map((a) => a.after).filter((v) => v !== void 0);
		const mean = (xs) => xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null;
		return {
			checkIns: checks.length,
			averageEnergy: mean(energies),
			rechargeMinutes: Math.round(sessions.reduce((t, a) => t + (a.minutes ?? 0), 0)),
			sessions: sessions.length,
			averageAfter: mean(afters)
		};
	}
	// src/core/logDraft.ts
	/**
	* Validates one reading with the crew console's entry rules and, when valid,
	* logs it to a mission store. Shared by the core bundle (iPad, CLI) and the
	* desktop app's "Import readings" command, so every host accepts and rejects
	* the same values.
	*/
	var NO_SYMPTOMS = {
		blurredVision: false,
		headache: false,
		eyePressure: false,
		otherSymptom: false
	};
	var text = (x) => typeof x === "string" ? x : typeof x === "number" && Number.isFinite(x) ? String(x) : "";
	/** Reads an untrusted row (from a file, IPC or a bridge) into a draft. */
	function toLogDraft(raw) {
		if (!isRecord$1(raw) || !isMetricId(raw.metricId)) return null;
		const symptoms = isRecord$1(raw.symptoms) ? {
			blurredVision: raw.symptoms.blurredVision === true,
			headache: raw.symptoms.headache === true,
			eyePressure: raw.symptoms.eyePressure === true,
			otherSymptom: raw.symptoms.otherSymptom === true
		} : void 0;
		const ctx = raw.glucoseContext;
		return {
			metricId: raw.metricId,
			missionDay: Number(raw.missionDay),
			shipTime: text(raw.shipTime),
			value: text(raw.value),
			systolic: text(raw.systolic),
			diastolic: text(raw.diastolic),
			...symptoms ? { symptoms } : {},
			...ctx === "fasting" || ctx === "post-meal" || ctx === "other" ? { glucoseContext: ctx } : {},
			notes: text(raw.notes)
		};
	}
	function logDraft(store, draft) {
		if (!isMetricId(draft.metricId)) return {
			ok: false,
			errors: { value: "Unknown indicator." }
		};
		const { settings, measurements, completions } = store.getState();
		const days = buildEffectiveDays(settings.scenarioId, measurements);
		const laterDoses = measurements.filter((x) => x.metricId === "radiation" && x.source !== "synthetic" && x.missionDay > draft.missionDay && typeof x.value === "number").map((x) => x.value);
		const result = validateMeasurement({
			metricId: draft.metricId,
			missionDay: String(draft.missionDay),
			shipTime: draft.shipTime,
			value: draft.value ?? "",
			systolic: draft.systolic ?? "",
			diastolic: draft.diastolic ?? "",
			symptoms: draft.symptoms ?? NO_SYMPTOMS,
			glucoseContext: draft.glucoseContext ?? "fasting",
			notes: draft.notes ?? ""
		}, {
			previousCumulativeDose: cumulativeDoseAt(days, draft.missionDay - 1),
			nextManualDose: laterDoses.length ? Math.min(...laterDoses) : null
		});
		if (!result.ok) return {
			ok: false,
			errors: result.errors
		};
		const tasks = getCountermeasureTasks(settings.aredTargetMinutes, settings.hydrationTargetLiters);
		const linked = tasksForDay({
			scenarioId: settings.scenarioId,
			tasks,
			days,
			completions,
			aredTargetMinutes: settings.aredTargetMinutes,
			hydrationTargetLiters: settings.hydrationTargetLiters
		}, result.missionDay).find((t) => t.linkedMetric === draft.metricId);
		const saved = store.logMeasurement({
			linkedTaskComplete: Boolean(linked?.completed),
			metricId: draft.metricId,
			value: result.value,
			missionDay: result.missionDay,
			recordedAt: result.recordedAt,
			...draft.source ? { source: draft.source } : {},
			...result.notes ? { notes: result.notes } : {},
			...result.glucoseContext ? { glucoseContext: result.glucoseContext } : {}
		});
		return {
			ok: true,
			persisted: saved.persisted,
			message: saved.message,
			completedTaskTitle: saved.completedTaskTitle ?? null
		};
	}
	// src/core/astraCore.ts
	/**
	* ASTRA-MED core: the same engines the web console uses, packaged behind one
	* JSON-in / JSON-out interface so any host can embed them.
	*
	* Hosts today:
	* - iPad app (SwiftUI) runs the bundle in JavaScriptCore.
	* - Desktop app (Electron, Windows and Linux) loads the full web console.
	* - `astra-core` command-line tool (Node) evaluates telemetry files.
	*
	* The core has no network access and no UI. Storage is whatever the host
	* passes in (a `StorageLike` with getItem / setItem / removeItem). Every
	* status, threshold and piece of guidance text comes from `src/engine`,
	* `src/config` and `src/data`; this file only wires them together.
	*/
	var CORE_VERSION = "1.0.0";
	var DATA_LABEL = "SYNTHETIC";
	/** Display-only reference lines for charts. Statuses never come from here. */
	var CHART_LINES = {
		heartRate: {
			reference: [HEART_RATE.reference.min, HEART_RATE.reference.max],
			caution: [HEART_RATE.cautionBelow, HEART_RATE.cautionAbove],
			critical: [HEART_RATE.criticalAbove],
			provenance: HEART_RATE.provenance
		},
		bloodPressure: {
			reference: [BLOOD_PRESSURE.reference.diastolic.min, BLOOD_PRESSURE.reference.systolic.max],
			caution: [BLOOD_PRESSURE.cautionAbove.systolic, BLOOD_PRESSURE.cautionAbove.diastolic],
			critical: [BLOOD_PRESSURE.criticalAbove.systolic, BLOOD_PRESSURE.criticalAbove.diastolic],
			provenance: BLOOD_PRESSURE.provenance
		},
		bloodGlucose: {
			reference: [BLOOD_GLUCOSE.reference.min, BLOOD_GLUCOSE.reference.max],
			caution: [BLOOD_GLUCOSE.cautionBelow, BLOOD_GLUCOSE.cautionAtOrAbove],
			critical: [BLOOD_GLUCOSE.criticalBelow, BLOOD_GLUCOSE.criticalAtOrAbove],
			provenance: BLOOD_GLUCOSE.provenance
		},
		bodyTemperature: {
			reference: [BODY_TEMPERATURE.reference.min, BODY_TEMPERATURE.reference.max],
			caution: [BODY_TEMPERATURE.cautionAtOrAbove],
			critical: [BODY_TEMPERATURE.criticalAtOrAbove],
			provenance: BODY_TEMPERATURE.provenance
		},
		sleep: {
			reference: [SLEEP.reference.min, SLEEP.reference.max],
			caution: [SLEEP.cautionBelow],
			critical: [SLEEP.criticalBelow],
			provenance: SLEEP.provenance
		},
		mood: {
			reference: [MOOD.reference.min, MOOD.reference.max],
			caution: [MOOD.cautionAtOrBelow],
			critical: [MOOD.criticalAtOrBelow],
			provenance: MOOD.provenance
		}
	};
	/** Which chart row keys belong to which metric. */
	var SERIES_KEYS = {
		heartRate: ["heartRate"],
		bloodPressure: ["systolic", "diastolic"],
		bloodGlucose: ["bloodGlucose"],
		bodyTemperature: ["bodyTemperature"],
		sleep: ["sleep"],
		mood: ["mood"],
		aredMinutes: ["aredMinutes"],
		radiation: ["cumulativeDose", "dailyDose"],
		pvt: ["pvt"],
		hydration: ["hydration"],
		symptoms: []
	};
	/** Chart row keys whose manual-entry twin does not follow the `<key>Manual` pattern. */
	var MANUAL_KEYS = {
		aredMinutes: "aredManual",
		cumulativeDose: "cumulativeManual",
		dailyDose: "cumulativeManual"
	};
	function uniqueSources(list) {
		const seen = /* @__PURE__ */ new Set();
		return list.filter((s) => s !== null && !seen.has(s.url) && Boolean(seen.add(s.url)));
	}
	/** In-memory storage for hosts that do not pass one (tests, one-shot CLI runs). */
	function memoryStorage(seed = {}) {
		const map = new Map(Object.entries(seed));
		return {
			getItem: (k) => map.get(k) ?? null,
			setItem: (k, v) => void map.set(k, v),
			removeItem: (k) => void map.delete(k)
		};
	}
	function createAstraCore(backend = memoryStorage(), options = {}) {
		const now = options.now ?? (() => /* @__PURE__ */ new Date());
		const storage = createStorageService(backend);
		const mission = createMissionStore(storage);
		const tuesday = createTuesdayStore(storage);
		const archived = getArchivedEvents();
		/** Everything the engines derive for the selected day, same wiring as the web console. */
		function model() {
			const { settings, measurements, completions, followUps: followUpLog } = mission.getState();
			const { scenarioId, selectedDay: day, aredTargetMinutes, hydrationTargetLiters, radiationLimitMsv, pvtMinMs, pvtMaxMs } = settings;
			const days = buildEffectiveDays(scenarioId, measurements);
			const engineInput = {
				days,
				settings: {
					aredTargetMinutes,
					hydrationTargetLiters,
					radiationLimitMsv,
					pvtMinMs,
					pvtMaxMs
				},
				evaluatedAt: now().toISOString()
			};
			const missionDays = evaluateMissionDays(engineInput);
			const diagnostics = evaluateAllMetrics(engineInput, day);
			const advisories = [...scenarioAdvisories(scenarioId, day), ...donkiAdvisories(archived, now().getTime())];
			const overall = aggregateStatus(diagnostics, advisories);
			const systems = evaluateBodySystems(diagnostics, advisories);
			const taskDefinitions = getCountermeasureTasks(aredTargetMinutes, hydrationTargetLiters);
			const readinessInput = {
				scenarioId,
				tasks: taskDefinitions,
				days,
				completions,
				aredTargetMinutes,
				hydrationTargetLiters
			};
			const tasks = tasksForDay(readinessInput, day);
			const followUps = buildFollowUps({
				day,
				diagnostics,
				advisories,
				yesterdayTasks: day > 1 ? tasksForDay(readinessInput, day - 1) : [],
				taskDefinitions,
				log: followUpLog
			});
			return {
				settings,
				day,
				days,
				missionDays,
				diagnostics,
				advisories,
				overall,
				systems,
				tasks,
				followUps,
				readiness: computeReadiness(readinessInput, day, followUps, diagnostics),
				trends: trendWatch(days, day, diagnostics),
				drift: baselineDrift(days, day),
				primaryAction: mostImportantAction(followUps, tasks, day),
				readinessInput,
				measurements
			};
		}
		function tuesdayContext(m) {
			const recentEnergy = [...tuesday.getState().activity].reverse().find((a) => a.kind === "checkin" && a.energy !== void 0)?.energy ?? null;
			return {
				day: m.day,
				overall: m.overall.status,
				diagnostics: m.diagnostics,
				systems: m.systems,
				advisories: m.advisories,
				trends: m.trends,
				drift: m.drift,
				primaryAction: m.primaryAction.text,
				lightMinutes: missionSignalMinutes(m.day),
				recentEnergy
			};
		}
		function snapshot(args = {}) {
			const m = model();
			const linkUp = args.linkUp ?? false;
			const delay = missionSignalMinutes(m.day);
			const scenario = SCENARIOS[m.settings.scenarioId];
			const td = tuesday.getState();
			const wellbeing = wellbeingSummary(td.activity, m.day);
			const metrics = ALL_METRIC_IDS.map((id) => {
				const d = m.diagnostics[id];
				const g = METRIC_GUIDANCE[id];
				return {
					id,
					name: g.name,
					shortName: g.shortName,
					unit: g.unit,
					system: g.system,
					status: d.status,
					summary: d.summary,
					explanation: d.explanation,
					recommendedNextStep: d.recommendedNextStep,
					freshness: d.freshness,
					persistenceDays: d.persistenceDays,
					value: d.latest ? formatWithUnit(id, d.latest.value) : null,
					delta: d.latest && d.previous ? formatDelta(id, d.latest.value, d.previous.value) : null,
					recordedAt: d.latest ? formatReadingStamp(d.latest.missionDay, d.latest.recordedAt) : null,
					source: d.latest?.source ?? null,
					notes: d.notes,
					rules: d.triggeredRules,
					basis: d.basis,
					guidance: {
						whatItMeasures: g.whatItMeasures,
						whyItMatters: g.whyItMatters,
						deviceRequired: g.deviceRequired,
						howToMeasure: g.howToMeasure,
						microgravityEffects: g.microgravityEffects,
						whenToRepeat: g.whenToRepeat,
						whatToRecord: g.whatToRecord,
						nextStep: g.nextStep,
						reference: g.reference
					}
				};
			});
			const hazards = hazardMap({
				systems: m.systems,
				diagnostics: m.diagnostics,
				advisories: m.advisories,
				drift: m.drift,
				linkUp,
				signalDelayMinutes: delay,
				queuedMessages: td.outbox.length,
				checkInsThisWeek: wellbeing.checkIns,
				rechargeMinutesThisWeek: wellbeing.rechargeMinutes
			});
			return {
				coreVersion: CORE_VERSION,
				dataLabel: DATA_LABEL,
				disclaimer: GUIDANCE_DISCLAIMER,
				mission: {
					name: MISSION.name,
					shortName: MISSION.shortName,
					crewId: MISSION.crewId,
					crewLabel: MISSION.crewLabel,
					totalDays: MISSION.totalDays
				},
				day: m.day,
				shipTime: currentShipTime(now()),
				signalDelayMinutes: delay,
				settings: m.settings,
				storage: mission.getState().storage,
				scenario: {
					id: scenario.id,
					code: scenario.code,
					name: scenario.name,
					summary: scenario.summary,
					focusDay: scenario.focusDay,
					events: scenario.events
				},
				scenarios: SCENARIO_ORDER.map((id) => ({
					id,
					code: SCENARIOS[id].code,
					name: SCENARIOS[id].name,
					summary: SCENARIOS[id].summary,
					focusDay: SCENARIOS[id].focusDay
				})),
				overall: {
					status: m.overall.status,
					counts: m.overall.counts,
					advisoryCount: m.overall.advisoryCount,
					drivers: m.overall.drivers.map((d) => d.metricId)
				},
				dayStatus: m.missionDays.overall,
				metrics,
				systems: Object.values(m.systems).map((s) => ({
					id: s.id,
					name: BODY_SYSTEMS[s.id].name,
					shortName: BODY_SYSTEMS[s.id].shortName,
					status: s.status,
					metrics: BODY_SYSTEMS[s.id].metrics,
					whyItMatters: BODY_SYSTEMS[s.id].whyItMatters,
					observations: s.observations,
					recommendedNextStep: s.recommendedNextStep
				})),
				advisories: m.advisories.map((a) => ({
					id: a.id,
					source: a.source,
					level: a.level,
					severity: a.severity,
					phase: a.phase,
					title: a.title,
					summary: a.summary,
					whyItMatters: a.whyItMatters,
					nextStep: a.nextStep,
					provenanceLabel: a.provenanceLabel,
					actions: a.actions.map((x) => x.text)
				})),
				tasks: m.tasks,
				followUps: m.followUps,
				readiness: m.readiness,
				primaryAction: m.primaryAction,
				trends: m.trends,
				drift: {
					state: m.drift.state,
					text: m.drift.text,
					unusualDays: m.drift.unusualDays,
					latestScore: m.drift.latestScore,
					scores: m.drift.scores,
					drivers: m.drift.drivers
				},
				hazards,
				hazardInfo: SPACEFLIGHT_HAZARDS,
				contactSteps: {
					onboardFirst: ONBOARD_FIRST,
					noLink: NO_LINK_STEPS,
					linkUpNote: LINK_UP_NOTE
				},
				wellbeing,
				sun: subsolarPoint(now()),
				tuesday: {
					messages: td.messages,
					outbox: td.outbox,
					bestScore: td.bestScore,
					persisted: tuesday.isPersisted()
				}
			};
		}
		/** Chart series for one metric over a trend window. Days after the selected day have no values. */
		function series(args) {
			const m = model();
			const range = windowRange(m.day, args.window, MISSION.totalDays);
			const rows = buildChartRows(m.days, m.day, range);
			const keys = SERIES_KEYS[args.metricId];
			return {
				metricId: args.metricId,
				range,
				keys,
				points: rows.map((r) => ({
					day: r.day,
					status: m.missionDays.byMetric[args.metricId][r.day - 1] ?? "NOMINAL",
					values: Object.fromEntries(keys.map((k) => [k, typeof r[k] === "number" ? r[k] : null])),
					manual: keys.some((k) => {
						const manualKey = MANUAL_KEYS[k] ?? `${k}Manual`;
						return typeof r[manualKey] === "number" || typeof r[manualKey.replace(/Manual$/, "Tuesday")] === "number";
					})
				})),
				lines: CHART_LINES[args.metricId] ?? null,
				events: SCENARIOS[m.settings.scenarioId].events.filter((e) => e.metrics.includes(args.metricId) && e.endDay >= range[0] && e.startDay <= range[1])
			};
		}
		function logMeasurement(raw) {
			const draft = toLogDraft(raw);
			if (!draft) return {
				ok: false,
				errors: { value: "Unknown indicator." }
			};
			const saved = logDraft(mission, draft);
			if (!saved.ok) return saved;
			return {
				...saved,
				status: model().diagnostics[draft.metricId].status
			};
		}
		/** Tuesday's answer with no language model: the same fixed replies and onboard guidance as the web console. */
		function tuesdayAsk(args) {
			const question = args.text.trim().slice(0, 1200);
			if (!question) return null;
			const ctx = tuesdayContext(model());
			tuesday.addMessage({
				role: "user",
				text: question
			});
			const intent = detectIntent(question);
			let text;
			let actions;
			let sources = [];
			let fixed = false;
			if (intent === "crisis") {
				text = CRISIS_REPLY;
				actions = actionsFor("crisis", ctx);
				fixed = true;
			} else {
				const vitals = reportedVitalsReply(readingsInText(question));
				if (vitals || intent === "urgent") {
					const r = vitals ?? {
						text: "That can be serious, so please don't wait on me. Stop what you're doing and stay still, seated or restrained. Tell a crewmate now, and contact the medical officer by the mission's urgent channel. If you have a mission-approved device, take your heart rate and blood pressure and keep the numbers for the medical officer. Tuesday can't tell what is causing this and gives no treatment.",
						actions: actionsFor("urgent", ctx)
					};
					text = r.text;
					actions = r.actions;
					fixed = true;
				} else {
					const passages = retrieve(knowledgeIndex(), question, 4);
					const r = offlineReply(intent, ctx, passages);
					text = r.text;
					actions = r.actions;
					sources = uniqueSources(passages.slice(0, 1).map((p) => p.doc.source));
				}
			}
			const msg = tuesday.addMessage({
				role: "tuesday",
				text,
				via: "core",
				actions,
				sources
			});
			return {
				intent,
				fixed,
				message: msg
			};
		}
		/**
		* Prompt for an on-device model (Apple Foundation Models on iPad, Ollama on
		* desktop). Returns null when the question must get a fixed reply instead.
		*/
		function tuesdayModelPrompt(args) {
			const question = args.text.trim().slice(0, 1200);
			const intent = detectIntent(question);
			if (!question || intent === "crisis" || intent === "urgent" || reportedVitalsReply(readingsInText(question))) return null;
			const m = model();
			const passages = retrieve(knowledgeIndex(), question, 4);
			const history = tuesday.getState().messages.filter((x) => x.text && !x.attachment && x.role !== "officer").slice(-8).map((x) => ({
				role: x.role === "user" ? "user" : "assistant",
				content: x.text
			}));
			return {
				intent,
				system: TUESDAY_SYSTEM_PROMPT,
				messages: buildModelMessages(buildHealthBrief(tuesdayContext(m)), passages, history, question),
				sources: uniqueSources(passages.map((p) => p.doc.source)),
				hasPassages: passages.length > 0
			};
		}
		/** Stores a model answer after the safety filter. The raw answer is never stored. */
		function tuesdayRecordModelAnswer(args) {
			const ctx = tuesdayContext(model());
			const filtered = safetyFilter(args.answer);
			if (!args.hasPassages) filtered.text = filtered.text.replace(/\s?\[\d+\]/g, "");
			tuesday.addMessage({
				role: "user",
				text: args.question.trim().slice(0, 1200)
			});
			const text = filtered.text || "I don't have a good answer for that. If it's about your health, contact the medical officer when communication is available.";
			return tuesday.addMessage({
				role: "tuesday",
				text,
				via: "model",
				model: args.model.slice(0, 80),
				actions: actionsFor(detectIntent(args.question), ctx),
				sources: args.sources,
				...filtered.removed ? { filtered: filtered.removed } : {}
			});
		}
		function report() {
			const m = model();
			return buildSurgeonReport({
				day: m.day,
				scenario: SCENARIOS[m.settings.scenarioId],
				overall: m.overall,
				systems: m.systems,
				diagnostics: m.diagnostics,
				trends: m.trends,
				advisories: m.advisories,
				followUps: m.followUps,
				readiness: m.readiness,
				days: m.days,
				generatedAt: now().toISOString().slice(0, 16).replace("T", " "),
				signalDelayMinutes: missionSignalMinutes(m.day),
				drift: m.drift
			});
		}
		function medicalMessage(args) {
			const m = model();
			return buildMedicalMessage({
				day: m.day,
				shipTime: currentShipTime(now()),
				priority: args.priority,
				overall: m.overall.status,
				diagnostics: m.diagnostics,
				trends: m.trends,
				drift: m.drift,
				advisories: m.advisories,
				report: args.report.slice(0, 1200),
				actionsTaken: args.actionsTaken.slice(0, 800),
				linkUp: args.linkUp,
				signalDelayMinutes: missionSignalMinutes(m.day)
			});
		}
		const ACTIVITY_KINDS = [
			"checkin",
			"earth",
			"game",
			"breathe"
		];
		const handlers = {
			snapshot: (a) => snapshot({ linkUp: a.linkUp === true }),
			series: (a) => series({
				metricId: isMetricId(a.metricId) ? a.metricId : "heartRate",
				window: [
					7,
					30,
					90,
					180
				].find((w) => w === a.window) ?? 30
			}),
			setDay: (a) => (mission.setSelectedDay(Number(a.day)), true),
			setScenario: (a) => isScenarioId(a.scenarioId) ? mission.setScenario(a.scenarioId) : {
				ok: false,
				persisted: false,
				message: "Unknown scenario."
			},
			logMeasurement: (a) => logMeasurement(a),
			deleteMeasurement: (a) => mission.deleteMeasurement(String(a.id)),
			measurements: () => mission.getState().measurements.filter((x) => x.source !== "synthetic"),
			setTaskCompletion: (a) => mission.setTaskCompletion(Number(a.day), String(a.taskId), a.completed === true),
			setFollowUpCompletion: (a) => mission.setFollowUpCompletion(Number(a.day), String(a.id), a.completed === true),
			updatePlanTargets: (a) => mission.updatePlanTargets(Number(a.aredTargetMinutes), Number(a.hydrationTargetLiters)),
			resetDemoData: () => mission.resetDemoData(),
			tuesdayAsk: (a) => tuesdayAsk({ text: String(a.text ?? "") }),
			tuesdayModelPrompt: (a) => tuesdayModelPrompt({ text: String(a.text ?? "") }),
			tuesdayRecordModelAnswer: (a) => tuesdayRecordModelAnswer({
				question: String(a.question ?? ""),
				answer: String(a.answer ?? ""),
				model: String(a.model ?? "on-device model"),
				hasPassages: a.hasPassages === true,
				sources: Array.isArray(a.sources) ? a.sources.filter((s) => isRecord$1(s) && typeof s.label === "string" && typeof s.url === "string") : []
			}),
			safetyFilter: (a) => safetyFilter(String(a.text ?? "")),
			clearConversation: () => tuesday.clearConversation(),
			logActivity: (a) => {
				const kind = ACTIVITY_KINDS.find((k) => k === a.kind);
				if (!kind) return { persisted: false };
				const num = (x, lo, hi) => typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : void 0;
				const entry = {
					kind,
					missionDay: mission.getState().settings.selectedDay,
					...num(a.minutes, 0, 600) !== void 0 ? { minutes: num(a.minutes, 0, 600) } : {},
					...num(a.score, 0, 1e6) !== void 0 ? { score: num(a.score, 0, 1e6) } : {},
					...num(a.mood, 1, 5) !== void 0 ? { mood: num(a.mood, 1, 5) } : {},
					...num(a.energy, 1, 5) !== void 0 ? { energy: num(a.energy, 1, 5) } : {}
				};
				return { persisted: tuesday.logActivity(entry).persisted };
			},
			queueMessage: (a) => tuesday.queueMessage({
				missionDay: mission.getState().settings.selectedDay,
				priority: a.priority === "urgent" ? "urgent" : "routine",
				text: String(a.text ?? "").slice(0, 6e3)
			}),
			removeQueued: (a) => tuesday.removeQueued(String(a.id)),
			report: () => report(),
			medicalMessage: (a) => medicalMessage({
				priority: a.priority === "urgent" ? "urgent" : "routine",
				report: String(a.report ?? ""),
				actionsTaken: String(a.actionsTaken ?? ""),
				linkUp: a.linkUp === true
			})
		};
		return {
			snapshot,
			series,
			logMeasurement,
			tuesdayAsk,
			tuesdayModelPrompt,
			tuesdayRecordModelAnswer,
			report,
			medicalMessage,
			mission,
			tuesday,
			/** Names accepted by `call`. */
			methods: Object.keys(handlers),
			/**
			* Single entry point for hosts that bridge strings (JavaScriptCore, IPC).
			* Returns `{"ok":true,"result":…}` or `{"ok":false,"error":"…"}`. Never throws.
			*/
			call(method, argsJson = "{}") {
				try {
					const handler = handlers[method];
					if (!handler) return JSON.stringify({
						ok: false,
						error: `Unknown method: ${method}`
					});
					const parsed = argsJson ? JSON.parse(argsJson) : {};
					const result = handler(isRecord$1(parsed) ? parsed : {});
					return JSON.stringify({
						ok: true,
						result: result ?? null
					});
				} catch (e) {
					return JSON.stringify({
						ok: false,
						error: e instanceof Error ? e.message : "Core error"
					});
				}
			}
		};
	}
	// src/core/bundle.ts
	/**
	* Entry for the standalone core bundle (`dist-core/astra-core.js`).
	* Exposes `AstraCore` on the global object so JavaScriptCore, a WebView or
	* Node can load one file with no module system.
	*/
	var api = {
		version: CORE_VERSION,
		create: createAstraCore,
		memoryStorage
	};
	globalThis.AstraCore = api;
	exports.AstraCore = api;
	return exports;
})({});
