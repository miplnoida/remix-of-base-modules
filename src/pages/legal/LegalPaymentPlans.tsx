/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Eye, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAllLgArrangementLinks } from "@/services/legal/lgRegistryService";
import { formatDateForDisplay } from "@/lib/format-config";

const LegalPaymentPlans = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["lg_arrangement_links_all"],
    queryFn: listAllLgArrangementLinks,
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return links;
    return links.filter(l =>
      l.lg_case?.lg_case_no?.toLowerCase().includes(s) ||
      l.payment_arrangement_id?.toLowerCase().includes(s) ||
      l.link_type?.toLowerCase().includes(s)
    );
  }, [links, search]);

  const stats = useMemo(() => ({
    total: links.length,
    monitored: links.filter(l => l.default_monitoring_required).length,
    byType: new Set(links.map(l => l.link_type)).size,
  }), [links]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Payment Arrangements"
        subtitle="Payment arrangements linked to legal cases"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/lg/dashboard" },
          { label: "Payment Plans", href: "/legal/payment-plans" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Linked Arrangements</div><div className="text-2xl font-bold">{stats.total}</div></div><CreditCard className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Default Monitoring</div><div className="text-2xl font-bold">{stats.monitored}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Link Types</div><div className="text-2xl font-bold">{stats.byType}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Arrangements Registry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search case/arrangement/link type..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Arrangement ID</TableHead>
                  <TableHead>Link Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Linked At</TableHead>
                  <TableHead>Monitor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payment arrangements linked</TableCell></TableRow>
                ) : filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <button className="text-primary hover:underline" onClick={() => navigate(`/legal/lg/cases/${l.lg_case_id}`)}>
                        {l.lg_case?.lg_case_no ?? '—'}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.payment_arrangement_id}</TableCell>
                    <TableCell><Badge variant="outline">{l.link_type}</Badge></TableCell>
                    <TableCell className="text-sm">{l.source_module}</TableCell>
                    <TableCell>{formatDateForDisplay(l.linked_at)}</TableCell>
                    <TableCell>{l.default_monitoring_required ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/lg/cases/${l.lg_case_id}`)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">To link a new arrangement, open the case and use the Settlements tab.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalPaymentPlans;
