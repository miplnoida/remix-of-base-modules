import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { holidays } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function HolidayManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddHoliday = () => {
    toast({
      title: "Holiday Added",
      description: "New holiday has been added to the calendar."
    });
    setIsAddDialogOpen(false);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    toast({
      title: "Holiday Deleted",
      description: "Holiday has been removed from the calendar.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holiday Management</h1>
          <p className="text-muted-foreground">
            Manage public holidays and SSB-specific holidays |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Holiday</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Holiday Name</Label>
                <Input placeholder="Independence Day" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>Country/Region</Label>
                <Input placeholder="St. Kitts & Nevis" />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="ssbSpecific" className="rounded" />
                <Label htmlFor="ssbSpecific" className="cursor-pointer">
                  SSB-specific holiday (not a public holiday)
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddHoliday}>Add Holiday</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Public Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidays.filter(h => !h.isSSBSpecific).length}</div>
            <p className="text-xs text-muted-foreground mt-1">National holidays</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">SSB Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidays.filter(h => h.isSSBSpecific).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Organization-specific</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidays.length}</div>
            <p className="text-xs text-muted-foreground mt-1">This year</p>
          </CardContent>
        </Card>
      </div>

      {/* Holidays Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holiday Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Country/Region</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {new Date(holiday.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>{holiday.country}</TableCell>
                  <TableCell>
                    {holiday.isSSBSpecific ? (
                      <Badge variant="outline" className="bg-blue-50">SSB-Specific</Badge>
                    ) : (
                      <Badge className="bg-green-500">Public Holiday</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
