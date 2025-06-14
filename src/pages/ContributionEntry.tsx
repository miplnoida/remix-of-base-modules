
import React, { useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ContributionEntry = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filters, setFilters] = useState({
    employerId: '',
    period: '',
    status: '',
    uploadDate: ''
  });
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().includes('c3') || file.type === 'text/csv') {
        setSelectedFile(file);
        toast({
          title: "File Selected",
          description: `${file.name} is ready for upload`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid C3 file (CSV format)",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      toast({
        title: "File Uploaded Successfully",
        description: `${selectedFile.name} has been processed`,
      });
      setSelectedFile(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Contribution Entry</h1>
                <p className="text-gray-600 mt-2">Upload and manage employee contribution files (C3 format)</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Section */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        C3 File Upload
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload">Select C3 File</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleFileUpload}
                          className="mt-1"
                        />
                      </div>
                      
                      {selectedFile && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              {selectedFile.name}
                            </span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Size: {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      )}

                      <Button 
                        onClick={handleSubmit} 
                        disabled={!selectedFile}
                        className="w-full"
                      >
                        Upload & Process
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters Section */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Search & Filter Contributions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="employer-id">Employer ID</Label>
                          <Input
                            id="employer-id"
                            placeholder="Enter Employer ID"
                            value={filters.employerId}
                            onChange={(e) => setFilters(prev => ({ ...prev, employerId: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="period">Contribution Period</Label>
                          <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Periods</SelectItem>
                              <SelectItem value="2024-01">January 2024</SelectItem>
                              <SelectItem value="2024-02">February 2024</SelectItem>
                              <SelectItem value="2024-03">March 2024</SelectItem>
                              <SelectItem value="2024-04">April 2024</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="processed">Processed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="upload-date">Upload Date</Label>
                          <Input
                            id="upload-date"
                            type="date"
                            value={filters.uploadDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, uploadDate: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                        <Button variant="outline" onClick={() => setFilters({ employerId: '', period: '', status: '', uploadDate: '' })}>
                          Clear Filters
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Uploads */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Recent Uploads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div>
                            <p className="font-medium">C3_202404_EMP001.csv</p>
                            <p className="text-sm text-gray-600">Uploaded on 2024-04-15</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Processed</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div>
                            <p className="font-medium">C3_202404_EMP002.csv</p>
                            <p className="text-sm text-gray-600">Uploaded on 2024-04-14</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ContributionEntry;
