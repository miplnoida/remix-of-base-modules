import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Filter, 
  Search, 
  X,
  Eye,
  Edit,
  CheckCircle,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

export interface DataTableColumn {
  key: string;
  label: string;
  minWidth?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface DataTableProps {
  data: any[];
  columns: DataTableColumn[];
  title?: string;
  searchPlaceholder?: string;
  showRecordsOptions?: number[];
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onApprove?: (id: number | string) => void;
  onReject?: (id: number | string) => void;
  actions?: {
    view?: boolean;
    edit?: boolean;
    approve?: boolean;
    reject?: boolean;
  } | false;
  idField?: string;
  statusField?: string;
  getStatusBadge?: (status: string) => React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  title = "Data Table",
  searchPlaceholder = "Search...",
  showRecordsOptions = [10, 25, 50, 100],
  onView,
  onEdit,
  onApprove,
  onReject,
  actions = { view: true, edit: true, approve: true, reject: true },
  idField = 'id',
  statusField = 'status',
  getStatusBadge
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(showRecordsOptions[0]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(col => col.key));

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  // Filter columns based on filter search term
  const filteredColumns = useMemo(() => {
    if (!filterSearchTerm) return columns;
    
    return columns.filter(column => 
      column.label.toLowerCase().includes(filterSearchTerm.toLowerCase())
    );
  }, [columns, filterSearchTerm]);

  // Get visible columns based on selected filters
  const displayColumns = useMemo(() => {
    if (selectedFilters.length === 0) return columns;
    return columns.filter(column => selectedFilters.includes(column.key));
  }, [columns, selectedFilters]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, recordsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);
  const startEntry = (currentPage - 1) * recordsPerPage + 1;
  const endEntry = Math.min(currentPage * recordsPerPage, filteredData.length);

  // Handle pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Handle records per page change
  const handleRecordsPerPageChange = (value: string) => {
    const newRecordsPerPage = parseInt(value);
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Handle filter selection
  const handleFilterToggle = (columnKey: string) => {
    setSelectedFilters(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAllFilters = () => {
    setSelectedFilters(filteredColumns.map(col => col.key));
  };

  const handleClearAllFilters = () => {
    setSelectedFilters([]);
  };

  const handleApplyFilter = () => {
    setVisibleColumns(selectedFilters.length > 0 ? selectedFilters : columns.map(col => col.key));
    setFilterDialogOpen(false);
  };

  // Handle export
  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting as ${format}...`);
    // Implement export logic here
  };

  // Handle action buttons
  const handleView = (row: any) => {
    if (onView) onView(row);
  };

  const handleEdit = (row: any) => {
    if (onEdit) onEdit(row);
  };

  const handleApprove = (row: any) => {
    if (onApprove) onApprove(row[idField]);
  };

  const handleReject = (row: any) => {
    if (onReject) onReject(row[idField]);
  };

  return (
    <>
    <div className="flex flex-col sm:flex-row sm:items-center sm:space-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-20 w-full">
            {/* Search Input */}
            <div className="relative w-full ">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-full w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Show Records Dropdown */}
            <div className="flex items-center gap-2">
               <span className="text-sm text-gray-600">show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {showRecordsOptions.map(option => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">records</span>
            </div>
          </div>
        </div>
    <Card>
      <CardContent className="p-6">
        {/* Search and Show Records Row */}
        

        {/* Table Title, Export, and Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <CardTitle className="text-base lg:text-lg">
            {title} ({filteredData.length})
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Export Button */}
            <div className="relative">
              <Select onValueChange={(value) => handleExport(value as 'csv' | 'pdf')}>
                <SelectTrigger  className="w-auto border border-[#0284C7] text-[#0284C7]">
                  <Download className="h-4 w-4 text-[#0284C7]" /> &nbsp;
                    Export
                    &nbsp; 
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Export as CSV</SelectItem>
                  <SelectItem value="pdf">Export as PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Button */}
            <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader className='mt-5'>
                  <div className="flex items-center justify-between">
                    <DialogTitle>Filter Fields</DialogTitle>
                    <div className="flex items-center gap-4">
                      <Input 
                        placeholder="Search Field" 
                        className="w-48"
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <button 
                          onClick={handleSelectAllFilters}
                          className="text-blue-600 hover:underline text-[#0284C7]"
                        >
                          Select All
                        </button>
                        <span>|</span>
                        <button 
                          onClick={handleClearAllFilters}
                          className="text-blue-600 hover:underline text-[#0284C7]"
                        >
                          Clear All
                        </button>
                        <span className="text-gray-500">
                          {selectedFilters.length} selected
                        </span>
                      </div>
                      <Button 
                        onClick={handleApplyFilter}
                        variant="default"
                        size="sm"
                      >
                        Apply Filter
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {filteredColumns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={selectedFilters.includes(column.key)}
                        onCheckedChange={() => handleFilterToggle(column.key)}
                      />
                      <Label htmlFor={column.key} className="text-sm m-0">
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {displayColumns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className={column.minWidth ? `min-w-[${column.minWidth}]` : ''}
                  >
                    {column.label}
                  </TableHead>
                ))}
                {(actions && (actions.view || actions.edit || actions.approve || actions.reject)) && (
                  <TableHead className="min-w-[150px] sticky right-0 bg-background">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow key={index}>
                  {displayColumns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render 
                        ? column.render(row[column.key], row)
                        : column.key === statusField && getStatusBadge
                        ? getStatusBadge(row[column.key])
                        : String(row[column.key] || '')
                      }
                    </TableCell>
                  ))}
                  {(actions && (actions.view || actions.edit || actions.approve || actions.reject)) && (
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex gap-1">
                        {actions.view && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="View Details"
                            onClick={() => handleView(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {actions.edit && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Edit"
                            onClick={() => handleEdit(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {actions.approve && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            title="Approve"
                            onClick={() => handleApprove(row)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {actions.reject && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            title="Reject"
                            onClick={() => handleReject(row)}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="text-sm text-gray-600">
            Showing {startEntry} to {endEntry} of {filteredData.length} entries
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
};
