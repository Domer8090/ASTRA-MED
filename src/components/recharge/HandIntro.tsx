import { useState } from "react";
import { Camera, Hand, HandGrab, Move, ScanEye, ZoomIn } from "lucide-react";
import { Segmented } from "../shared/Segmented";

interface Props {
  hands: 1 | 2;
  onStart: (hands: 1 | 2, dontShowAgain: boolean) => void;
  onCancel: () => void;
}

const ONE = [
  { icon: HandGrab, title: "Pinch to grab", text: "Touch thumb and index finger. On Earth, keep pinching and move to turn the globe. In Orbit Catch, pinch over a pod to collect it." },
  { icon: ZoomIn, title: "Zoom with buttons", text: "Use + and − on Earth, or pinch with both hands and pull apart. A relaxed hand never moves anything." },
  { icon: Hand, title: "Open and close to breathe", text: "In Breathe, open your hand as you breathe in and close it as you breathe out." },
];

const TWO = [
  { icon: ZoomIn, title: "Pull apart to zoom", text: "Pinch with both hands, then move them apart to zoom in or together to zoom out." },
  { icon: Move, title: "Move together to turn", text: "Keep both hands pinched and move them the same way to turn the globe." },
  { icon: HandGrab, title: "Catch with either hand", text: "In Orbit Catch each hand has its own cursor. In Breathe, open and close both hands." },
];

/** Short instructions shown before the camera starts. */
export function HandIntro({ hands: initial, onStart, onCancel }: Props) {
  const [hands, setHands] = useState<1 | 2>(initial);
  const [dontShow, setDontShow] = useState(false);
  const steps = hands === 1 ? ONE : TWO;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="hand-intro-title" className="fixed inset-0 z-10 grid place-items-center bg-space/80 p-4">
      <div className="panel w-full max-w-lg p-5">
        <h3 id="hand-intro-title" className="flex items-center gap-2 font-cond text-lg font-bold text-ink">
          <Hand aria-hidden="true" className="h-5 w-5 text-tue" />
          Hand control
        </h3>
        <p className="mt-1 text-sm text-ink-2">Control the Recharge deck with your hands in front of the camera.</p>
        <Segmented<1 | 2>
          className="mt-3"
          label="Hands to track"
          value={hands}
          onChange={setHands}
          options={[
            { value: 1, label: "One hand" },
            { value: 2, label: "Two hands" },
          ]}
        />
        <ol className="mt-3 flex flex-col gap-2.5">
          {steps.map((s) => (
            <li key={s.title} className="flex gap-3">
              <s.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-tue" />
              <p className="text-sm text-ink">
                <span className="font-semibold">{s.title}. </span>
                <span className="text-ink-2">{s.text}</span>
              </p>
            </li>
          ))}
          <li className="flex gap-3">
            <ScanEye aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
            <p className="text-sm text-ink-2">Keep your hand 30 to 60 cm from the camera, in good light, with the palm facing the screen. The preview at the bottom right shows the lines the camera reads.</p>
          </li>
        </ol>
        <p className="mt-3 text-xs text-ink-3">Camera frames are processed in this browser and never leave the device. Mouse, touch and keyboard keep working.</p>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          Don't show this again
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn btn-primary" data-autofocus onClick={() => onStart(hands, dontShow)}>
            <Camera aria-hidden="true" className="h-4 w-4" />
            Start camera
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
