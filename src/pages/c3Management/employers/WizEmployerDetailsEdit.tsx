import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Save, X, Building2, MapPin, User, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  getEmployerDetails, updateEmployer, uploadCompanyLogo,
  parseE164Phone, composeE164,
  type WizEmployerDetails
} from '@/services/wizAdminApiService';

const COUNTRIES = ["Saint Kitts", "Nevis", "Other"];
const SECURITY_QUESTIONS = [
  "What Is Your Birth Place",
  "What Is Your Favorite Place",
  "What Is Your Favorite Dish",
  "What Is Your Mother's Maiden Name",
  "What Is Your First Pet's Name",
];

const DIAL_CODES = [
  { value: '+1869', label: '(+1869) St. Kitts & Nevis' },
  { value: '+1868', label: '(+1868) Trinidad & Tobago' },
  { value: '+1767', label: '(+1767) Dominica' },
  { value: '+1758', label: '(+1758) St. Lucia' },
  { value: '+1784', label: '(+1784) St. Vincent' },
  { value: '+1473', label: '(+1473) Grenada' },
  { value: '+1246', label: '(+1246) Barbados' },
  { value: '+1268', label: '(+1268) Antigua & Barbuda' },
  { value: '+1', label: '(+1) US/Canada' },
  { value: '+44', label: '(+44) UK' },
  { value: '+91', label: '(+91) India' },
];

const WizEmployerDetails: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<WizEmployerDetails | null>(null);

  // Company form
  const [companyData, setCompanyData] = useState<Record<string, any>>({});
  // Phone split state
  const [mobileDialCode, setMobileDialCode] = useState('+1869');
  const [mobileLocal, setMobileLocal] = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState('+1869');
  const [phoneLocal, setPhoneLocal] = useState('');
  // User form
  const [userData, setUserData] = useState<Record<string, any>>({});
  // Security questions
  const [sq, setSq] = useState({ question1: '', answer1: '', question2: '', answer2: '' });
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);
  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLogoUrl(d.company.logo_url || null);

      // Parse E.164 phone numbers
      const mobileParsed = parseE164Phone(d.company.mobile);
      setMobileDialCode(mobileParsed.dialCode);
      setMobileLocal(mobileParsed.localNumber);
      const phoneParsed = parseE164Phone(d.company.phone);
      setPhoneDialCode(phoneParsed.dialCode);
      setPhoneLocal(phoneParsed.localNumber);

      setCompanyData({
        registration_number: d.company.registration_number || '',
        company_name: d.company.company_name || '',
        trade_name: d.company.trade_name || '',
        contact_person: d.company.contact_person || '',
        email: d.company.email || '',
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
          answer1: d.security_questions[0]?.answer_hash || '',
          question2: d.security_questions[1]?.question || '',
          answer2: d.security_questions[1]?.answer_hash || '',
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
      // Compose E.164 back
      const saveData = {
        ...companyData,
        mobile: composeE164(mobileDialCode, mobileLocal),
        phone: composeE164(phoneDialCode, phoneLocal),
      };
      // Only send user_data if we have a valid user with names
      const hasValidUser = userData.user_id && userData.first_name && userData.last_name;
      
      // Only send security_questions if both Q&A pairs are fully populated
      const hasValidSq = sq.question1 && sq.answer1 && sq.question2 && sq.answer2;

      await updateEmployer({
        company_id: Number(companyId),
        company_data: saveData,
        user_data: hasValidUser ? userData : undefined,
        security_questions: hasValidSq ? sq : undefined,
      });
      toast.success('Employer updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update employer');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await uploadCompanyLogo(Number(companyId), base64);
        setLogoUrl(res.data?.logo_url || null);
        toast.success('Logo uploaded successfully');
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || 'Logo upload failed');
      setLogoUploading(false);
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
          {/* Company Logo + top fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center gap-2 border rounded-lg p-6 bg-muted/30">
              <div className="w-24 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-foreground border-primary hover:bg-primary/10"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
              >
                <Upload className="h-3 w-3 mr-1" />
                {logoUploading ? 'Uploading...' : 'Update Company Logo'}
              </Button>
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
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <Select value={mobileDialCode} onValueChange={setMobileDialCode}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAL_CODES.map(dc => (
                        <SelectItem key={dc.value} value={dc.value}>{dc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={mobileLocal}
                    onChange={e => setMobileLocal(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
              <div>
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <Select value={phoneDialCode} onValueChange={setPhoneDialCode}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAL_CODES.map(dc => (
                        <SelectItem key={dc.value} value={dc.value}>{dc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={phoneLocal}
                    onChange={e => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1"
                    placeholder="Enter phone number"
                  />
                </div>
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

          {/* Security Questions – write-only, answers are hashed server-side */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              🔐 Security Questions
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Answers are loaded from the server. Modify only if you want to change them.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-destructive">Question 1 *</Label>
                <Select value={sq.question1} onValueChange={v => setSq(p => ({ ...p, question1: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a question" /></SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-destructive">Answer 1 *</Label>
                <div className="relative">
                  <Input
                    type={showAnswer1 ? 'text' : 'password'}
                    value={sq.answer1}
                    onChange={e => setSq(p => ({ ...p, answer1: e.target.value }))}
                    placeholder={details?.security_questions?.[0] ? '••••••••  (leave blank to keep)' : 'Enter answer'}
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
                <Label className="text-destructive">Question 2 *</Label>
                <Select value={sq.question2} onValueChange={v => setSq(p => ({ ...p, question2: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a question" /></SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-destructive">Answer 2 *</Label>
                <div className="relative">
                  <Input
                    type={showAnswer2 ? 'text' : 'password'}
                    value={sq.answer2}
                    onChange={e => setSq(p => ({ ...p, answer2: e.target.value }))}
                    placeholder={details?.security_questions?.[1] ? '••••••••  (leave blank to keep)' : 'Enter answer'}
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
