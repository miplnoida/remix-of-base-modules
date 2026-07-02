import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gavel, ArrowUpRight } from "lucide-react";

/**
 * DEPRECATED — legacy screen retained per the route-retirement plan.
 * The live Orders & Judgments registry is `CourtOrdersManagement` at
 * `/legal/court-orders`, which reads from `lg_order` with full state-machine
 * actions. This page previously fabricated order numbers, employers and
 * financials from case rows — all removed.
 *
 * A soft-redirect is triggered after mount; the manual link below is the
 * user-visible fallback while the redirect fires.
 */
export default function LegalOrderRegistry() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = window.setTimeout(() => navigate("/legal/court-orders", { replace: true }), 1200);
    return () => window.clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen p-6">
      <Card className="max-w-xl mx-auto mt-16">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Gavel className="h-12 w-12 text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold">Order Registry has moved</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            The legacy Order Registry is retired. All orders and judgments are
            now managed in Court Orders & Judgments, which reads live data
            from <code>lg_order</code>.
          </p>
          <Button asChild size="sm" className="mt-4 gap-2">
            <Link to="/legal/court-orders">
              Go to Court Orders <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Redirecting…</p>
        </CardContent>
      </Card>
    </div>
  );
}
