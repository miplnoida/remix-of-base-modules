import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useSampleApplication, 
  useCreateSampleApplication, 
  useUpdateSampleApplication,
  useSubmitSampleApplication 
} from '@/hooks/useSampleApplications';

export default function SampleApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    applicant_comments: '',
  });

  const { data: application, isLoading: loadingApp } = useSampleApplication(id);
  const createApplication = useCreateSampleApplication();
  const updateApplication = useUpdateSampleApplication();
  const submitApplication = useSubmitSampleApplication();

  useEffect(() => {
    if (application) {
      setFormData({
        title: application.title || '',
        description: application.description || '',
        amount: application.amount?.toString() || '',
        applicant_comments: application.applicant_comments || '',
      });
    }
  }, [application]);

  const canEdit = !isEditing || application?.status === 'Draft' || application?.status === 'MoreInfoRequested';

  const handleSaveDraft = async () => {
    if (isEditing) {
      await updateApplication.mutateAsync({
        id,
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        applicant_comments: formData.applicant_comments,
      });
    } else {
      const result = await createApplication.mutateAsync({
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        applicant_comments: formData.applicant_comments,
      });
      navigate(`/sample-applications/${result.id}/edit`);
    }
  };

  const handleSubmit = async () => {
    let applicationId = id;
    
    if (!isEditing) {
      // First save the application
      const result = await createApplication.mutateAsync({
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        applicant_comments: formData.applicant_comments,
      });
      applicationId = result.id;
    } else if (application?.status === 'Draft' || application?.status === 'MoreInfoRequested') {
      // Update before submitting
      await updateApplication.mutateAsync({
        id,
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        applicant_comments: formData.applicant_comments,
      });
    }
    
    // Submit for approval
    await submitApplication.mutateAsync(applicationId!);
    navigate('/sample-applications');
  };

  const isPending = createApplication.isPending || updateApplication.isPending || submitApplication.isPending;

  if (isEditing && loadingApp) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sample-applications')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? 'Edit Application' : 'New Application'}
          </h1>
          <p className="text-muted-foreground">
            {application?.status === 'MoreInfoRequested' 
              ? 'Please provide additional information and resubmit'
              : 'Fill in the details and submit for approval'
            }
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>
            Provide the required information for your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Application Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a descriptive title"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your application in detail"
              rows={4}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($) *</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Applicant Comments</Label>
            <Textarea
              id="comments"
              value={formData.applicant_comments}
              onChange={(e) => setFormData(prev => ({ ...prev, applicant_comments: e.target.value }))}
              placeholder="Add any additional comments or notes"
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {canEdit && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isPending || !formData.title || !formData.description || !formData.amount}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !formData.title || !formData.description || !formData.amount}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
