import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listActivity, type ContractReview } from "@/services/legal/contractReviewService";
import { formatDateForDisplay } from "@/lib/format-config";

export function ContractActivityTab({ review }: { review: ContractReview }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { listActivity(review.id).then(setRows); }, [review.id]);

  return (
    <Card>
      <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 && <div className="text-center text-muted-foreground py-6">No activity yet</div>}
        <ol className="relative border-l ml-3 space-y-3">
          {rows.map(r => (
            <li key={r.id} className="ml-4">
              <div className="absolute -left-[5px] w-2 h-2 rounded-full bg-primary mt-2" />
              <div className="text-xs text-muted-foreground">{formatDateForDisplay(r.created_at)} · {r.actor_user_code ?? "system"}</div>
              <div className="text-sm"><b>{r.activity_type.replace(/_/g, " ")}</b> — {r.description}</div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
