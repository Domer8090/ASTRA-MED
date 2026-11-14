import { Component, type ErrorInfo, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Keeps one failing panel from taking down the whole console. */
export class PanelBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Never log measurement values; the error message and component stack are enough.
    console.error(`[ASTRA-MED] ${this.props.name} failed to render:`, error.message, info.componentStack?.split("\n")[1]?.trim());
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="panel flex flex-col items-start gap-3 p-5">
        <p className="flex items-center gap-2 font-semibold text-caution">
          <TriangleAlert aria-hidden="true" className="h-4 w-4" />
          {this.props.name} could not be displayed.
        </p>
        <p className="text-sm text-ink-2">The rest of the console keeps working. Reload this panel, or reset demo data from Data Sources if the problem continues.</p>
        <button type="button" className="btn btn-secondary" onClick={() => this.setState({ failed: false })}>
          Reload panel
        </button>
      </div>
    );
  }
}
