import type { MeasurementSource } from "../../types/health";
import type { Provenance } from "./ProvenanceTag";

/** The provenance tag for a stored or synthetic reading. */
export function provenanceForSource(source: MeasurementSource): Provenance {
  switch (source) {
    case "synthetic":
      return "SYNTHETIC";
    case "tuesday":
      return "TUESDAY";
    case "device":
      return "DEVICE";
    case "device-sim":
      return "SIM DEVICE";
    default:
      return "MANUAL";
  }
}
