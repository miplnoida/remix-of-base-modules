import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { CaseTable } from "@/components/legal/CaseTable";
import { CaseCard } from "@/components/legal/CaseCard";
import { useLegalCases } from "@/contexts/LegalCaseContext";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Badge } from "@/components/ui/badge";

const CASE_TYPES = ['Non-Payment', 'Non-Compliance', 'Fraud', 'Appeal', 'Prosecution', 'Recovery', 'Employer Dispute', 'IP Dispute'];
const STATUSES = ['Draft', 'Filed', 'Under Review', 'Hearing Scheduled', 'Hearing Held', 'Decision Pending', 'Order Issued', 'Closed – Compliant', 'Closed – Non-Compliant', 'Withdrawn', 'Appealed', 'Reopened'];

const SAVED_VIEWS = [
  { id: 'my-active', label: 'My Active' },
  { id: 'hearing-week', label: 'Hearing this week' },
  { id: 'awaiting-decision', label: 'Awaiting Decision' }
];

export default function SSBCaseList() {
  const navigate = useNavigate();
  const { cases } = useLegalCases();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<string | null>(null);

  const handleCaseClick = (id: string) => {
    navigate(`/legal/cases/${id}`);
  };

  const handleNewCase = () => {
    navigate('/legal/cases/new');
  };

  const applyFilters = (casesData: typeof cases) => {
    let filtered = casesData;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.number.toLowerCase().includes(query) ||
        c.parties.some(p => p.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    if (activeView === 'my-active') {
      filtered = filtered.filter(c => !c.status.startsWith('Closed') && c.status !== 'Withdrawn');
    } else if (activeView === 'hearing-week') {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filtered = filtered.filter(c => {
        if (!c.next_event_at) return false;
        const eventDate = new Date(c.next_event_at);
        return eventDate >= new Date() && eventDate <= weekFromNow;
      });
    } else if (activeView === 'awaiting-decision') {
      filtered = filtered.filter(c => c.status === 'Decision Pending' || c.stage === 'Under Advisement');
    }

    return filtered;
  };

  const filteredCases = applyFilters(cases);

  return (
    <div className="min-h-screen bg-background">
      <BackNavigation />
      
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cases</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage legal cases and proceedings</p>
            </div>
            <Button onClick={handleNewCase} className="gap-2">
              <Plus className="h-4 w-4" />
              New Case
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            {SAVED_VIEWS.map(view => (
              <Badge
                key={view.id}
                variant={activeView === view.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveView(activeView === view.id ? null : view.id)}
              >
                {view.label}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, case #, party…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CASE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="hidden md:block">
          <CaseTable cases={filteredCases} onCaseClick={handleCaseClick} />
        </div>

        <div className="md:hidden space-y-4">
          {filteredCases.map(caseData => (
            <CaseCard key={caseData.id} case={caseData} onClick={() => handleCaseClick(caseData.id)} />
          ))}
        </div>

        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No cases found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating a new case'}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={handleNewCase} className="gap-2">
                <Plus className="h-4 w-4" />
                New Case
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
