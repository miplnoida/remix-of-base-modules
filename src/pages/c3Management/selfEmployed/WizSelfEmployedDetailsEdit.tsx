import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { User, MapPin, Eye, EyeOff, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSelfEmployedDetails,
  updateSelfEmployed,
  getCountries,
  WizSelfEmployedDetails,
  WizCountry,
} from '@/services/wizSelfEmployedService';
import { supabase } from '@/integrations/supabase/client';
import { parseE164Phone, composeE164 } from '@/services/wizAdminApiService';

interface IncomeCategoryOption {
  category_code: string;
  wage_upper: number;
  weekly_contribution: number;
}

const SECURITY_QUESTIONS = [
  "What Is Your Birth Place",
  "What Is Your Favorite Dish",
  "What Is Your Favorite Place",
  "What Is Your Maiden Name",
];

const WizSelfEmployedDetailsEdit: React.FC = () => {
  const { selfEmployedId } = useParams<{ selfEmployedId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<IncomeCategoryOption[]>([]);
  const [countries, setCountries] = useState<WizCountry[]>([]);
  const [wizCategoryMap, setWizCategoryMap] = useState<Map<string, number>>(new Map());

  // Phone state
  const [mobileDialCode, setMobileDialCode] = useState('+1869');
  const [mobileLocal, setMobileLocal] = useState('');

  // Security question visibility
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [detailsRes, catResult, ratesResult, wizCatResult, countryRes] = await Promise.all([
          getSelfEmployedDetails(Number(selfEmployedId)),
          (supabase as any).from('tb_income_cat').select('category_code, wage_upper').order('wage_upper'),
          (supabase as any).from('tb_self_emp_contrib_rate').select('wage_cat, sep_ss_percent, effstart, effend').order('effstart', { ascending: false }),
          supabase.from('c3_wage_category').select('category_id, category, weekly_income'),
          getCountries(),
        ]);
        const d = detailsRes.data as WizSelfEmployedDetails;

        // Build wizard category_id → category_code mapping
        const wizCats = (wizCatResult.data || []) as { category_id: number; category: string; weekly_income: number }[];
        
        // Resolve the stored category_Type (wizard category_id) to category_code for form value
        const wizMatch = wizCats.find(w => w.category_id === d.category_Type);
        const resolvedCategoryCode = wizMatch?.category || d.category_Type?.toString() || '';

        setForm({
          socSecNum: d.socSecNum || '',
          email: d.email || '',
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          birthDate: d.birthDate || '',
          category_Type: resolvedCategoryCode,
          phone: d.phone || '',
          tin: d.tin || '',
          maritalStat: d.maritalStat || '',
          rblgender: d.rblgender === true ? 'true' : d.rblgender === false ? 'false' : '',
          address1: d.address1 || '',
          address2: d.address2 || '',
          city: d.city || '',
          zip: d.zip || '',
          country: d.country || '',
          occupation: d.occupation || '',
          question1: d.question1 || '',
          answer1: d.answer1 || '',
          question2: d.question2 || '',
          answer2: d.answer2 || '',
          loginId: d.loginId || '',
        });

        // Parse mobile
        const parsed = parseE164Phone(d.mobile);
        setMobileDialCode(parsed.dialCode);
        setMobileLocal(parsed.localNumber);

        // Build categories with weekly_contribution from current rates
        const incCats = (catResult.data || []) as { category_code: string; wage_upper: number }[];
        const rates = (ratesResult.data || []) as { wage_cat: number; sep_ss_percent: number; effstart: string; effend: string }[];
        const now = new Date();
        const enriched: IncomeCategoryOption[] = incCats.map(cat => {
          const activeRate = rates.find(r =>
            Number(r.wage_cat) === Number(cat.wage_upper) &&
            new Date(r.effstart) <= now &&
            new Date(r.effend) >= now
          );
          const ssPercent = activeRate?.sep_ss_percent ?? 0;
          return {
            category_code: cat.category_code,
            wage_upper: Number(cat.wage_upper),
            weekly_contribution: Number(((Number(cat.wage_upper) * ssPercent) / 100).toFixed(2)),
          };
        });
        setCategories(enriched);
        // Build category_code → wizard category_id map for save
        const codeToIdMap = new Map<string, number>();
        wizCats.forEach(w => { if (w.category) codeToIdMap.set(w.category, w.category_id); });
        setWizCategoryMap(codeToIdMap);
        setCountries(countryRes.data?.countries || []);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selfEmployedId]);

  const updateField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const validate = (): string | null => {
    if (!form.firstName?.trim()) return 'First Name is required';
    if (!form.lastName?.trim()) return 'Last Name is required';
    if (!form.email?.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email format';
    if (form.email.includes(' ')) return 'Email must not contain spaces';
    const mobile = mobileLocal.replace(/\D/g, '');
    const phone = (form.phone || '').replace(/\D/g, '');
    if (!mobile && !phone) return 'Either Mobile or Phone number is required';
    if (mobile && (mobile.length < 7 || mobile.length > 15)) return 'Mobile must be 7-15 digits';
    if (phone && (phone.length < 7 || phone.length > 15)) return 'Phone must be 7-15 digits';
    if (form.question1 && form.question2 && form.question1 === form.question2) return 'Security Question 1 and 2 must be different';
    if (form.question1 && !form.answer1?.trim()) return 'Answer 1 is required';
    if (form.question2 && !form.answer2?.trim()) return 'Answer 2 is required';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        socSecNum: form.socSecNum,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || '',
        mobile: composeE164(mobileDialCode, mobileLocal) || '',
        tin: form.tin || '',
        birthDate: form.birthDate || '',
        rblgender: form.rblgender === 'true' ? true : form.rblgender === 'false' ? false : null,
        maritalStat: form.maritalStat || '',
        address1: form.address1 || '',
        address2: form.address2 || '',
        city: form.city || '',
        zip: form.zip || '',
        country: form.country || '',
        occupation: form.occupation || '',
        category_Type: form.category_Type ? Number(form.category_Type) : null,
        question1: form.question1 || '',
        answer1: form.answer1 || '',
        question2: form.question2 || '',
        answer2: form.answer2 || '',
      };
      await updateSelfEmployed(Number(selfEmployedId), payload);
      toast.success('Self Employee data Successfully Updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Build category description matching legacy format
  const getCategoryLabel = (cat: IncomeCategoryOption) =>
    `${cat.category_code} (Weekly Income : ${Number(cat.wage_upper).toFixed(2)}, Weekly Contribution : ${Number(cat.weekly_contribution).toFixed(2)} )`;

  return (
    <div className="space-y-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage
              className="cursor-pointer text-primary"
              onClick={() => navigate('/c3-management/self-employed-details')}
            >
              Self Employee Details
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Section 1: Self Employed Basic Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Self Employed Basic Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Social Security *</Label>
              <Input value={form.socSecNum} disabled className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label>Email Id *</Label>
              <Input value={form.email} disabled className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Date of Birth *</Label>
              <Input value={formatBirthDate(form.birthDate)} disabled className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label>Category Type *</Label>
              <Select value={form.category_Type} onValueChange={(v) => updateField('category_Type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  {categories.map(cat => (
                    <SelectItem key={cat.category_code} value={cat.category_code}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Mobile Number *</Label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 border rounded-md px-2 bg-muted min-w-[80px]">
                  <span className="text-sm">{mobileDialCode}</span>
                </div>
                <Input
                  className="flex-1"
                  value={mobileLocal}
                  onChange={(e) => setMobileLocal(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Phone digits"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Phone Number *</Label>
              <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>TIN</Label>
              <Input value={form.tin} onChange={(e) => updateField('tin', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Marital Status</Label>
              <Select value={form.maritalStat} onValueChange={(v) => updateField('maritalStat', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Gender *</Label>
              <Select value={form.rblgender} onValueChange={(v) => updateField('rblgender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="true">Male</SelectItem>
                  <SelectItem value="false">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Address Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Address Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Address #1</Label>
              <Input value={form.address1} onChange={(e) => updateField('address1', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Address #2</Label>
              <Input value={form.address2} onChange={(e) => updateField('address2', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input value={form.zip} onChange={(e) => updateField('zip', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={(v) => updateField('country', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  {countries.map(c => (
                    <SelectItem key={c.conId} value={c.conId.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Occupation</Label>
              <Input value={form.occupation} onChange={(e) => updateField('occupation', e.target.value)} placeholder="Enter Occupation" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: User Profile Details (Security Questions) */}
      <Card>
        <CardHeader className="pb-4 border-b border-primary">
          <CardTitle className="text-base">User Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>User Name</Label>
              <Input value={form.loginId} disabled className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Question1 *</Label>
              <Select value={form.question1} onValueChange={(v) => updateField('question1', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Question" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  {SECURITY_QUESTIONS.map(q => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Answer1 *</Label>
              <div className="relative">
                <Input
                  type={showAnswer1 ? 'text' : 'password'}
                  value={form.answer1}
                  onChange={(e) => updateField('answer1', e.target.value)}
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Question2 *</Label>
              <Select value={form.question2} onValueChange={(v) => updateField('question2', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Question" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  {SECURITY_QUESTIONS.map(q => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Answer2 *</Label>
              <div className="relative">
                <Input
                  type={showAnswer2 ? 'text' : 'password'}
                  value={form.answer2}
                  onChange={(e) => updateField('answer2', e.target.value)}
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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="border-green-500 text-green-600 hover:bg-green-50"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => navigate('/c3-management/self-employed-details')}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default WizSelfEmployedDetailsEdit;
