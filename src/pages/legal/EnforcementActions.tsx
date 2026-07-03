/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hammer, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAllLgOrders } from "@/services/legal/lgRegistryService";
import { formatDateForDisplay } from "@/lib/format-config";

// Enforcement = orders that require active enforcement: writs, garnishments,
// seizures, contempts, or any ACTIVE/ISSUED order with an expiry/effective date.
const ENFORCEMENT_TYPES = ["WRIT", "GARNISHMENT", "SEIZURE", "CONTEMPT", "EXECUTION"];

const EnforcementActions = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["lg_enforcement_orders"],
    queryFn: () => listAllLgOrders(),
  });

  const enforcement = useMemo(() =>
    orders.filter(o =>
      ENFORCEMENT_TYPES.includes(o.order_type_code) ||
      (o.status === "ACTIVE" && (o.expiry_date || o.effective_date))
    ),
    [orders]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return enforcement;
    return enforcement.filter(o =>
      o.order_no?.toLowerCase().includes(s) ||
      o.lg_case?.lg_case_no?.toLowerCase().includes(s)
    );
  }, [enforcement, search]);

  const now = new Date();
  const stats = useMemo(() => ({
    total: enforcement.length,
    active: enforcement.filter(o => o.status === "ACTIVE" || o.status === "ISSUED").length,
    expiringSoon: enforcement.filter(o => o.expiry_date && (new Date(o.expiry_date).getTime() - now.getTime()) < 30 * 86400000 && new Date(o.expiry_date) > now).length,
    expired: enforcement.filter(o => o.expiry_date && new Date(o.expiry_date) < now).length,
  }), [enforcement]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Enforcement Actions"
        subtitle="Writs, garnishments, seizures and other active enforcement orders"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/lg/dashboard" },
          { label: "Enforcement", href: "/legal/enforcement" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></div><Hammer className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Active</div><div className="text-2xl font-bold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Expiring &lt; 30d</div><div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Expired</div><div className="text-2xl font-bold text-destructive">{stats.expired}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Enforcement Registry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search order/case..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No enforcement actions found</TableCell></TableRow>
                ) : filtered.map(o => {
                  const expired = o.expiry_date && new Date(o.expiry_date) < now;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.order_no}</TableCell>
                      <TableCell>
                        <button className="text-primary hover:underline" onClick={() => navigate(`/legal/lg/cases/${o.lg_case_id}`)}>
                          {o.lg_case?.lg_case_no ?? '—'}
                        </button>
                      </TableCell>
                      <TableCell><Badge variant="outline">{o.order_type_code}</Badge></TableCell>
                      <TableCell>{o.issued_date ? formatDateForDisplay(o.issued_date) : '—'}</TableCell>
                      <TableCell>{o.effective_date ? formatDateForDisplay(o.effective_date) : '—'}</TableCell>
                      <TableCell className={expired ? 'text-destructive font-medium' : ''}>
                        {o.expiry_date ? (<span className="inline-flex items-center gap-1">{expired && <AlertTriangle className="h-3 w-3" />}{formatDateForDisplay(o.expiry_date)}</span>) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{o.ordered_amount != null ? `EC$${Number(o.ordered_amount).toLocaleString()}` : '—'}</TableCell>
                      <TableCell><Badge variant={expired ? 'destructive' : 'default'}>{o.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/lg/cases/${o.lg_case_id}`)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Enforcement orders are created from the case Orders tab.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnforcementActions;
