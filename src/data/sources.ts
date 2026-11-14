/**
 * Reference destinations for the Data Sources view.
 * Descriptions were checked against the linked pages on 2026-11-13 and are
 * paraphrased. None of these sources validates ASTRA-MED's thresholds.
 */

export interface SourceEntry {
  title: string;
  url: string;
  publisher: string;
  description: string;
  usedFor: string;
}

export const REFERENCE_SOURCES: SourceEntry[] = [
  {
    title: "5 Hazards of Human Spaceflight",
    url: "https://www.nasa.gov/hrp/hazards/",
    publisher: "NASA Human Research Program",
    description: "Space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments, and how they can feed off one another.",
    usedFor: "Organises the five body systems and features by hazard (Overview and system panel). The mapping is ASTRA-MED's own.",
  },
  {
    title: "Risks of Human Spaceflight",
    url: "https://www.nasa.gov/hrp/risks/",
    publisher: "NASA Human Research Program",
    description: "Index of HRP's human health and performance risks linked to the five hazards.",
    usedFor: "Entry point for the risk pages cited with individual recommendations.",
  },
  {
    title: "Monitoring radiation for astronaut health",
    url: "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
    publisher: "Canadian Space Agency (CSA), 2026-02-26",
    description:
      "CSA's Canadian Active Neutron Spectrometer (CANS), a compact instrument that measures neutron exposure continuously and autonomously. Neutrons make up about 30% of the total radiation on the ISS.",
    usedFor: "Context for why personal exposure comes from on-board dosimetry, not from space-weather alerts (space-weather monitor).",
  },
  {
    title: "How does radiation affect the human body in space?",
    url: "https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp",
    publisher: "Canadian Space Agency (CSA)",
    description: "Galactic cosmic rays, solar particle events and trapped radiation; acute effects are not expected except in a large solar particle event.",
    usedFor: "Why Scenario C treats a solar particle event as the case that needs shelter.",
  },
  {
    title: "Why do we conduct science experiments in space?",
    url: "https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp",
    publisher: "Canadian Space Agency (CSA)",
    description:
      "Moon and Mars missions bring more weightlessness, radiation, isolation and communication delay, and less ability to rely on Earth; ISS research characterises these risks and countermeasures.",
    usedFor: "Framing for on-board self-assessment and the Earth–Mars signal delay (Overview).",
  },
  {
    title: "DONKI WSA-ENLIL Simulations",
    url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    publisher: "NASA Community Coordinated Modeling Center (CCMC)",
    description:
      "DONKI catalogues CCMC's WSA-ENLIL heliospheric model runs for coronal mass ejections. Each run lists predicted arrival times at Earth and at planets and spacecraft, including Mars.",
    usedFor: "The Earth and Mars CME arrival forecast in the space-weather monitor and the CME notice in the status band. Forecast only; never a dose or a health status.",
  },
  {
    title: "Approximate Positions of the Planets (Keplerian elements)",
    url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
    publisher: "NASA JPL Solar System Dynamics (E. M. Standish)",
    description: "Keplerian elements and rates for approximate planet positions, valid 1800–2050.",
    usedFor: "Earth–Mars distance and one-way signal delay on today's date, computed in the browser.",
  },
  {
    title: "Spaceflight Standard Measures",
    url: "https://nlsp.nasa.gov/resources/standard-measures",
    publisher: "NASA Human Research Program, NASA Life Sciences Portal",
    description: "HRP's set of standard measurements collected across spaceflight studies, hosted on the NASA Life Sciences Portal.",
    usedFor: "Context for which kinds of measures are tracked. Not used to set any threshold.",
  },
  {
    title: "NASA Life Sciences Portal",
    url: "https://www.nasa.gov/hrp/nlsp/",
    publisher: "NASA Human Research Program",
    description:
      "Portal for human research data from spaceflight and ground-analog studies back to 1961. Its open-access datasets include head-down-tilt bed-rest campaigns run at the University of Texas Medical Branch (UTMB Bedrest Campaigns 1 and 3, and a 70-day bed-rest exercise and performance study).",
    usedFor: "Research context and the UTMB bed-rest dataset listing. ASTRA-MED does not use bed-rest data in its rules.",
  },
  {
    title: "NASA Open Science Data Repository (OSDR / GeneLab / ALSDA)",
    url: "https://osdr.nasa.gov/bio/repo",
    publisher: "NASA",
    description: "Open repository of space biology and life-science study data and metadata.",
    usedFor: "Research review. See the study notes below.",
  },
  {
    title: "NASA-STD-3001 Vol. 2, §4.0 Physical Characteristics and Capabilities",
    url: "https://www.nasa.gov/reference/4-0-physical-characteristics-and-capabilities-vol-2/",
    publisher: "NASA Human Integration Design Handbook",
    description: "Design reference for crew body dimensions, range of motion, mass, strength and aerobic capacity.",
    usedFor: "Human-factors context only.",
  },
  {
    title: "NASA Open APIs and DONKI",
    url: "https://api.nasa.gov/",
    publisher: "NASA",
    description:
      "NASA's public API gateway. DONKI (Space Weather Database Of Notifications, Knowledge, Information) is run by the Community Coordinated Modeling Center and catalogues flares, SEP events, CMEs and notifications.",
    usedFor: "Live, cached and bundled space-weather events. Environmental context only.",
  },
  {
    title: "CCMC DONKI system",
    url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    publisher: "NASA Community Coordinated Modeling Center",
    description: "The DONKI home, including the machine-readable catalogue of FLR, SEP and CME events and notifications.",
    usedFor: "Per-endpoint fallback host and the archived offline sample (2024-05-08 to 2024-05-16).",
  },
  {
    title: "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)",
    url: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
    publisher: "NASA Human Research Program",
    description: "NASA's summary of the SANS risk and why it needs monitoring.",
    usedFor: "Context for the neuro-ocular body-system text.",
  },
  {
    title: "Risk from Inadequate Sleep and Irregular Schedules",
    url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
    publisher: "NASA Human Research Program",
    description: "NASA's summary of performance and health risks from sleep loss, circadian desynchronisation and work overload.",
    usedFor: "Context for sleep, PVT and circadian guidance.",
  },
  {
    title: "Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness",
    url: "https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/",
    publisher: "NASA Human Research Program",
    description: "NASA's summary of fitness loss in spaceflight and the role of exercise countermeasures.",
    usedFor: "Context for musculoskeletal and cardiovascular text.",
  },
  {
    title: "Zeitlin et al. (2013), Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory",
    url: "https://doi.org/10.1126/science.1235989",
    publisher: "Science 340 (6136): 1080–1084",
    description: "Radiation measured by the RAD instrument inside the MSL spacecraft during its cruise to Mars.",
    usedFor: "Only to choose a plausible order of magnitude for the synthetic daily dose. No dose value in ASTRA-MED is a measurement.",
  },
  {
    title: "Data from NASA rover's voyage to Mars aids planning",
    url: "https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/",
    publisher: "NASA Jet Propulsion Laboratory",
    description: "JPL summary of the RAD cruise result: an average galactic cosmic ray dose-equivalent rate of about 1.8 mSv per day inside the spacecraft, during low to moderate solar activity.",
    usedFor: "Cross-check for the synthetic dosimeter level (about 1.8 mSv/day, about 324 mSv over 180 days).",
  },
  {
    title: "Risk of Behavioral Conditions and Psychiatric Disorders",
    url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/",
    publisher: "NASA Human Research Program",
    description: "Isolation and confinement can raise the risk of behavioural problems such as anxiety and depression; spacecraft windows and reminders of Earth can help reduce monotony.",
    usedFor: "Tuesday's wellbeing guidance and the reason the Recharge deck opens on an Earth view.",
  },
  {
    title: "Global Imagery Browse Services (GIBS)",
    url: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api",
    publisher: "NASA Earthdata",
    description: "Daily global satellite imagery served as map layers. ASTRA-MED uses MODIS Terra corrected-reflectance true colour, Blue Marble Next Generation and VIIRS city lights.",
    usedFor: "The Earth globe in Tuesday's Recharge deck: yesterday's real clouds, lit for the real Sun position now.",
  },
  {
    title: "EPIC: Earth Polychromatic Imaging Camera",
    url: "https://epic.gsfc.nasa.gov/about",
    publisher: "NASA Goddard / NOAA DSCOVR",
    description: "Full-disc photos of the sunlit Earth from the Sun–Earth L1 point, about 1.5 million km away, published several times a day.",
    usedFor: "The latest whole-Earth photo beside the globe.",
  },
  {
    title: "Isolation Forest (Liu, Ting and Zhou, 2008)",
    url: "https://doi.org/10.1109/ICDM.2008.17",
    publisher: "IEEE International Conference on Data Mining",
    description: "Anomaly detection that isolates unusual points with random splits; unusual points need fewer splits.",
    usedFor: "Baseline drift: scores recent days against the crew member's own earlier days. A cue, never a status.",
  },
];

export interface StudyNote {
  id: string;
  title: string;
  organism: string;
  summary: string;
  relevance: string;
}

export const OSDR_STUDIES: StudyNote[] = [
  {
    id: "OSD-817",
    title: "The ex vivo human translaminar autonomous system to study spaceflight associated neuro-ocular syndrome pathogenesis",
    organism: "Homo sapiens (donor optic nerve tissue)",
    summary:
      "Ground study. Human posterior eye segments were cultured for about 14 days under different intracranial-to-intraocular pressure pairs and optic nerve tilt, then examined with histology and imaging.",
    relevance: "Background for the neuro-ocular system. It is a tissue model and does not validate any self-check or threshold.",
  },
  {
    id: "OSD-987",
    title: "Comparison of Streptococcus mutans growth-phase dependent transcriptome changes in two different simulated microgravity models",
    organism: "Streptococcus mutans UA159",
    summary: "Ground study. RNA sequencing of an oral bacterium grown in two simulated-microgravity devices.",
    relevance: "Indirect: microbiology under simulated microgravity. Not used by any ASTRA-MED rule.",
  },
  {
    id: "OSD-989",
    title: "Identification of bioburden associated with nonmetallic spacecraft materials using culture-based and metagenomic analyses",
    organism: "Bacillus, Staphylococcus and other microbiota",
    summary: "Ground study comparing culture-based and metagenomic bioburden on 17 nonmetallic spacecraft materials, motivated by planetary protection.",
    relevance: "Spacecraft microbiology, not crew physiology. Listed because it was supplied for review; not used by any rule.",
  },
  {
    id: "OSD-1018",
    title: "Differential impact of social isolation and space radiation on behavior and motor learning in rats",
    organism: "Rattus norvegicus (Wistar, male)",
    summary: "Ground study. Rats received a single 15 cGy simulated galactic cosmic ray exposure, crossed with social isolation, followed by balance-beam and behaviour testing.",
    relevance: "Background for radiation and isolation effects on behaviour. Animal data; does not set any human threshold.",
  },
];

export const LIMITATIONS_STATEMENT =
  "ASTRA-MED is a NASA Space Apps Challenge prototype. Demonstration telemetry and configurable thresholds are illustrative and are not validated flight medical standards. Space-weather events are environmental indicators and do not represent personal radiation dose. This application does not diagnose, prescribe treatment, or replace mission-approved procedures or qualified medical personnel.";
