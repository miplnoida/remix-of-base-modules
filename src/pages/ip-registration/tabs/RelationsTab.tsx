import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, User, Heart, Users, Phone, Bookmark } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface RelationsTabProps {
  uniqueUuid: string;
  isEditable: boolean;
}

interface Relation {
  id: string;
  relation_type: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  email?: string;
  phone?: string;
  ssn?: string;
  status: string;
  updated_at: string;
}

const relationTypes = [
  { value: 'Contact', label: 'Contact', icon: Phone },
  { value: 'Parent', label: 'Parent', icon: Users },
  { value: 'Spouse', label: 'Spouse', icon: Heart },
  { value: 'Witness', label: 'Witness', icon: Bookmark },
  { value: 'Beneficiary', label: 'Beneficiary', icon: User },
  { value: 'Child', label: 'Child', icon: Users },
  { value: 'Sibling', label: 'Sibling', icon: Users },
];

const genders = ['Male', 'Female', 'Not Specified'];

export default function RelationsTab({ uniqueUuid, isEditable }: RelationsTabProps) {
  const { user } = useAuth();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [formData, setFormData] = useState<Partial<Relation>>({});

  const fetchRelations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tmp_ip_dependents')
        .select('*')
        .eq('unique_uuid', uniqueUuid)
        .neq('status', 'archive')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRelations(data || []);
    } catch (error) {
      console.error('Error fetching relations:', error);
      toast.error('Failed to load relations');
    } finally {
      setLoading(false);
    }
  }, [uniqueUuid]);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  const handleAdd = () => {
    setSelectedRelation(null);
    setFormData({
      relation_type: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      address: '',
      email: '',
      phone: '',
      ssn: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (relation: Relation) => {
    setSelectedRelation(relation);
    setFormData(relation);
    setShowDialog(true);
  };

  const handleDelete = (relation: Relation) => {
    setSelectedRelation(relation);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedRelation) return;

    try {
      // Copy to audit table
      await supabase.from('mi_tb_del_ip_depend').insert({
        original_id: selectedRelation.id,
        unique_uuid: uniqueUuid,
        relation_type: selectedRelation.relation_type,
        first_name: selectedRelation.first_name,
        middle_name: selectedRelation.middle_name,
        last_name: selectedRelation.last_name,
        date_of_birth: selectedRelation.date_of_birth,
        gender: selectedRelation.gender,
        address: selectedRelation.address,
        deleted_by: user?.id,
      });

      // Soft delete (set status to archive)
      const { error } = await supabase
        .from('tmp_ip_dependents')
        .update({ status: 'archive' })
        .eq('id', selectedRelation.id);

      if (error) throw error;

      toast.success('Relation deleted');
      fetchRelations();
    } catch (error) {
      console.error('Error deleting relation:', error);
      toast.error('Failed to delete relation');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedRelation(null);
    }
  };

  const handleSave = async () => {
    if (!formData.relation_type || !formData.first_name || !formData.last_name) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      if (selectedRelation) {
        // Update existing
        const { error } = await supabase
          .from('tmp_ip_dependents')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq('id', selectedRelation.id);

        if (error) throw error;
        toast.success('Relation updated');
      } else {
        // Insert new - get tmp_ip_id first
        const { data: tmpRecord } = await supabase
          .from('tmp_ip_master')
          .select('id')
          .eq('unique_uuid', uniqueUuid)
          .single();

        const { error } = await supabase
          .from('tmp_ip_dependents')
          .insert({
            tmp_ip_id: tmpRecord?.id,
            unique_uuid: uniqueUuid,
            relation_type: formData.relation_type || '',
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
            ssn: formData.ssn,
            status: 'A',
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Relation added');
      }

      setShowDialog(false);
      fetchRelations();
    } catch (error) {
      console.error('Error saving relation:', error);
      toast.error('Failed to save relation');
    }
  };

  const getRelationIcon = (type: string) => {
    const relType = relationTypes.find(r => r.value === type);
    if (relType) {
      const IconComponent = relType.icon;
      return <IconComponent className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'D': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relations</h2>
        {isEditable && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Relation
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : relations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No relations added yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {relations.map((relation) => (
            <Card key={relation.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      {getRelationIcon(relation.relation_type)}
                    </div>
                    <div>
                      <h3 className="font-medium">{relation.relation_type}</h3>
                      <p className="text-lg font-semibold">
                        {relation.first_name} {relation.middle_name} {relation.last_name}
                      </p>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        {relation.date_of_birth && (
                          <p>Date of Birth: {format(new Date(relation.date_of_birth), 'dd/MM/yyyy')}</p>
                        )}
                        {relation.gender && <p>Gender: {relation.gender}</p>}
                        {relation.address && <p>Resident Address: {relation.address}</p>}
                        {relation.email && <p>Email: {relation.email}</p>}
                        {relation.phone && <p>Phone: {relation.phone}</p>}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(relation.status)}`}>
                          {relation.status === 'A' ? 'Active' : relation.status === 'D' ? 'Deceased' : relation.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Modified: {format(new Date(relation.updated_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isEditable && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(relation)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(relation)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRelation ? 'Edit' : 'Add'} Relation</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Relation Type <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.relation_type} 
                onValueChange={(v) => setFormData({ ...formData, relation_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relation type" />
                </SelectTrigger>
                <SelectContent>
                  {relationTypes.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SSN</Label>
              <Input
                value={formData.ssn || ''}
                onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                placeholder="Enter SSN"
              />
            </div>

            <div className="space-y-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input
                value={formData.first_name || ''}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
              />
            </div>

            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input
                value={formData.middle_name || ''}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                placeholder="Enter middle name"
              />
            </div>

            <div className="space-y-2">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input
                value={formData.last_name || ''}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>

            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth || ''}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select 
                value={formData.gender || ''} 
                onValueChange={(v) => setFormData({ ...formData, gender: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Relation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the relation record. It can be recovered from the audit log if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
