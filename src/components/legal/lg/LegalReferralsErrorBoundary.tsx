import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State { error: Error | null }

export class LegalReferralsErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to console with context so the failure is visible to ops.
    console.error("[LegalReferralsWorkbench] runtime error", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="p-8 m-6 flex flex-col items-center gap-4 border-destructive/50">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <h2 className="font-semibold text-lg">Legal Referrals Workbench failed to load</h2>
            <p className="text-sm text-muted-foreground mt-1 break-all">{this.state.error.message}</p>
          </div>
          <Button onClick={() => this.setState({ error: null })}>Retry</Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
