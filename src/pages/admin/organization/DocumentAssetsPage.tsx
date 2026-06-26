import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const OUTPUTS = [
  { name: "Payment Receipt",                slots: ["Logo","Header","Footer","Seal","Signature","QR Code","Numbering"] },
  { name: "Contribution Statement",         slots: ["Logo","Header","Footer","Watermark","Disclaimer"] },
  { name: "Employer Account Statement",     slots: ["Logo","Header","Footer","Watermark","Disclaimer"] },
  { name: "Member Contribution History",    slots: ["Logo","Header","Footer","Disclaimer"] },
  { name: "Benefit Payment Statement",      slots: ["Logo","Header","Footer","Signature","Seal"] },
  { name: "Claim Acknowledgement",          slots: ["Logo","Header","Footer","Signature"] },
  { name: "Compliance Statement",           slots: ["Logo","Header","Footer","Seal","Disclaimer"] },
  { name: "Certificate of Registration",    slots: ["Logo","Header","Footer","Seal","Signature","QR Code","Watermark"] },
  { name: "Certificate of Compliance",      slots: ["Logo","Header","Footer","Seal","Signature","QR Code","Watermark"] },
];

function Inner() {
  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Receipt / Statement / Certificate Assets</h1>
          <p className="text-sm text-muted-foreground">Branding for financial and official generated documents.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {OUTPUTS.map((o) => (
          <Card key={o.name}>
            <CardContent className="p-4 space-y-2">
              <div className="font-medium">{o.name}</div>
              <div className="flex flex-wrap gap-1">
                {o.slots.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Pick logos, seals, signatures, watermarks and QR codes from the <Link to="/admin/organization/media-library" className="underline text-primary">Communication Assets Library</Link>. Numbering formats are configured per document in the relevant module.
      </p>
    </div>
  );
}

export default function DocumentAssetsPage() {
  return <PermissionWrapper moduleName="org_document_assets"><Inner /></PermissionWrapper>;
}
