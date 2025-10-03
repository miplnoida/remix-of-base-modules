import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaseTable } from "@/components/legal/CaseTable";
import { CaseCard } from "@/components/legal/CaseCard";
import { mockCases, savedViews, MockCase } from "@/data/mockLegalCases";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

type SavedView = 'all' | 'myActive' | 'hearingThisWeek' | 'awaitingDecision';

export default function SSBCaseList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<SavedView>('all');
  const [filteredCases, setFilteredCases] = useState<MockCase[]>(mockCases);

  useEffect(() => {
    // Set focus to page title on mount
    document.getElementById('page-title')?.focus();
  }, []);

  useEffect(() => {
    let cases = [...mockCases];

    // Apply saved view
    if (activeView === 'myActive') {
      cases = savedViews.myActive(cases);
    } else if (activeView === 'hearingThisWeek') {
      cases = savedViews.hearingThisWeek(cases);
    } else if (activeView === 'awaitingDecision') {
      cases = savedViews.awaitingDecision(cases);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      cases = cases.filter(c => 
        c.number.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.parties.some(p => p.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      cases = cases.filter(c => c.status === statusFilter);
    }

    setFilteredCases(cases);
  }, [searchQuery, statusFilter, activeView]);

  const handleCaseClick = (id: string) => {
    navigate(`/legal/cases/${id}`);
  };

  const handleNewCase = () => {
    toast.info("Preview mode: New case creation not available");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 
          id="page-title"
          className="text-3xl font-bold mb-2"
          tabIndex={-1}
        >
          Cases
        </h1>
        <p className="text-muted-foreground">
          Manage and track legal cases
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search by case #, title, or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search cases"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
              <SelectItem value="Hearing Scheduled">Hearing Scheduled</SelectItem>
              <SelectItem value="Decision Pending">Decision Pending</SelectItem>
              <SelectItem value="Filed">Filed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNewCase} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          New Case
        </Button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap" role="tablist" aria-label="Saved views">
        <Button
          variant={activeView === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('all')}
          role="tab"
          aria-selected={activeView === 'all'}
        >
          All Cases ({mockCases.length})
        </Button>
        <Button
          variant={activeView === 'myActive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('myActive')}
          role="tab"
          aria-selected={activeView === 'myActive'}
        >
          My Active ({savedViews.myActive(mockCases).length})
        </Button>
        <Button
          variant={activeView === 'hearingThisWeek' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('hearingThisWeek')}
          role="tab"
          aria-selected={activeView === 'hearingThisWeek'}
        >
          Hearing This Week ({savedViews.hearingThisWeek(mockCases).length})
        </Button>
        <Button
          variant={activeView === 'awaitingDecision' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('awaitingDecision')}
          role="tab"
          aria-selected={activeView === 'awaitingDecision'}
        >
          Awaiting Decision ({savedViews.awaitingDecision(mockCases).length})
        </Button>
      </div>

      {filteredCases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No cases found</p>
          <p className="text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <CaseTable cases={filteredCases} onCaseClick={handleCaseClick} />
          </div>
          <div className="md:hidden space-y-4">
            {filteredCases.map((caseData) => (
              <CaseCard
                key={caseData.id}
                case={caseData}
                onClick={() => handleCaseClick(caseData.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
