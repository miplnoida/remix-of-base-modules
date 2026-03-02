import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Save, X, Building2, MapPin, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployerDetails, updateEmployer, type WizEmployerDetails } from '@/services/wizAdminApiService';

const COUNTRIES = ["Saint Kitts", "Nevis", "Other"];
const SECURITY_QUESTIONS = [
  "What Is Your Birth Place",
  "What Is Your Favorite Place",
  "What Is Your Favorite Dish",
  "What Is Your Mother's Maiden Name",
  "What Is Your First Pet's Name",
];

const WizEmployerDetails: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<WizEmployerDetails | null>(null);

  // Company form
  const [companyData, setCompanyData] = useState<Record<string, any>>({});
  // User form
  const [userData, setUserData] = useState<Record<string, any>>({});
  // Security questions
  const [sq, setSq] = useState({ question1: '', answer1: '', question2: '', answer2: '' });
  // Show/hide answer fields
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadDetails();
  }, [companyId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await getEmployerDetails(Number(companyId));
      const d = res.data!;
      setDetails(d);
      setCompanyData({
        registration_number: d.company.registration_number || '',
        company_name: d.company.company_name || '',
        trade_name: d.company.trade_name || '',
        contact_person: d.company.contact_person || '',
        email: d.company.email || '',
        mobile: d.company.mobile || '',
        phone: d.company.phone || '',
        address_line1: d.company.address_line1 || '',
        address_line2: d.company.address_line2 || '',
        city: d.company.city || '',
        postal_code: d.company.postal_code || '',
        country: d.company.country || 'Saint Kitts',
        is_levy_exempt: d.company.is_levy_exempt || false,
      });
      if (d.primary_user) {
        setUserData({
          user_id: d.primary_user.id,
          first_name: d.primary_user.first_name || '',
          last_name: d.primary_user.last_name || '',
          username: d.primary_user.username || '',
        });
      }
      if (d.security_questions?.length > 0) {
        setSq({
          question1: d.security_questions[0]?.question || '',
          answer1: '',
          question2: d.security_questions[1]?.question || '',
          answer2: '',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load employer details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployer({
        company_id: Number(companyId),
        company_data: companyData,
        user_data: userData,
        security_questions: (sq.answer1 || sq.answer2) ? sq : undefined,
      });
      toast.success('Employer updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update employer');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => setCompanyData(prev => ({ ...prev, [field]: value }));
  const updateUserField = (field: string, value: any) => setUserData(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbPage className="cursor-pointer" onClick={() => navigate('/c3-management/employer-details')}>Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Employer Details</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Update Employer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Logo placeholder + top fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center gap-2 border rounded-lg p-6 bg-muted/30">
              <div className="w-24 h-24 bg-muted rounded flex items-center justify-center">
                <Building2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <span className="text-sm text-primary cursor-pointer">Update Company Logo</span>
              <p className="text-xs text-muted-foreground text-center">(Logo upload requires API support from C3-Wizard)</p>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <Label>Registration No. *</Label>
                <Input value={companyData.registration_number} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Email Id *</Label>
                <Input value={companyData.email} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div>
                <Label>Trade Name (if any)</Label>
                <Input value={companyData.trade_name} onChange={e => updateField('trade_name', e.target.value)} />
              </div>
              <div>
                <Label>Contact Person *</Label>
                <Input value={companyData.contact_person} onChange={e => updateField('contact_person', e.target.value)} />
              </div>
              <div>
                <Label>Mobile Number *</Label>
                <div className="flex gap-2">
                  <Input value="+1869" disabled className="w-20 bg-muted text-center" />
                  <Input value={companyData.mobile} onChange={e => updateField('mobile', e.target.value)} className="flex-1" placeholder="Enter mobile number" />
                </div>
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input value={companyData.phone} onChange={e => updateField('phone', e.target.value)} />
              </div>
              <div>
                <Label>Name of Company *</Label>
                <Input value={companyData.company_name} onChange={e => updateField('company_name', e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Label>Is Levy Exempt?</Label>
                <Checkbox
                  checked={companyData.is_levy_exempt}
                  onCheckedChange={v => updateField('is_levy_exempt', v)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Details */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4" /> Address Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Address #1 *</Label>
                <Input value={companyData.address_line1} onChange={e => updateField('address_line1', e.target.value)} />
              </div>
              <div>
                <Label>Address #2</Label>
                <Input value={companyData.address_line2} onChange={e => updateField('address_line2', e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={companyData.city} onChange={e => updateField('city', e.target.value)} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={companyData.postal_code} onChange={e => updateField('postal_code', e.target.value)} />
              </div>
              <div>
                <Label>Country</Label>
                <Select value={companyData.country} onValueChange={v => updateField('country', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Questions */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              🔐 Security Questions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-destructive">Question1 *</Label>
                <Select value={sq.question1} onValueChange={v => setSq(p => ({ ...p, question1: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a question" /></SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-destructive">Answer1 *</Label>
                <div className="relative">
                  <Input
                    type={showAnswer1 ? 'text' : 'password'}
                    value={sq.answer1}
                    onChange={e => setSq(p => ({ ...p, answer1: e.target.value }))}
                    placeholder={details?.security_questions?.[0] ? '••••••••' : 'Enter answer'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowAnswer1(!showAnswer1)}
                  >
                    {showAnswer1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-destructive">Question2 *</Label>
                <Select value={sq.question2} onValueChange={v => setSq(p => ({ ...p, question2: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a question" /></SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-destructive">Answer2 *</Label>
                <div className="relative">
                  <Input
                    type={showAnswer2 ? 'text' : 'password'}
                    value={sq.answer2}
                    onChange={e => setSq(p => ({ ...p, answer2: e.target.value }))}
                    placeholder={details?.security_questions?.[1] ? '••••••••' : 'Enter answer'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowAnswer2(!showAnswer2)}
                  >
                    {showAnswer2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* User Profile Details */}
          {details?.primary_user && (
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <User className="h-4 w-4" /> User Profile Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User Name</Label>
                  <Input value={userData.username} onChange={e => updateUserField('username', e.target.value)} />
                </div>
                <div />
                <div>
                  <Label>First Name *</Label>
                  <Input value={userData.first_name} onChange={e => updateUserField('first_name', e.target.value)} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={userData.last_name} onChange={e => updateUserField('last_name', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" onClick={() => navigate('/c3-management/employer-details')} className="text-destructive border-destructive">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WizEmployerDetails;
