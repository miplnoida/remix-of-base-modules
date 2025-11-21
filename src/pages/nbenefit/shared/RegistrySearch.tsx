import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RegistrySearch = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Benefit Registry Search</h1>
        <p className="text-muted-foreground mt-2">
          Unified search across all benefit applications
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, SSN, application number..." className="pl-10" />
            </div>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Benefit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Benefits</SelectItem>
                <SelectItem value="sickness">Sickness</SelectItem>
                <SelectItem value="employment-injury">Employment Injury</SelectItem>
                <SelectItem value="maternity">Maternity</SelectItem>
                <SelectItem value="funeral">Funeral Grant</SelectItem>
                <SelectItem value="age">Age Benefit</SelectItem>
                <SelectItem value="invalidity">Invalidity</SelectItem>
                <SelectItem value="assistance">Assistance</SelectItem>
                <SelectItem value="survivors">Survivors</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under-review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="in-payment">In Payment</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Enter search criteria to view benefit applications</p>
            <p className="text-sm mt-2">Search across all benefit types, insured persons, and employers</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegistrySearch;
