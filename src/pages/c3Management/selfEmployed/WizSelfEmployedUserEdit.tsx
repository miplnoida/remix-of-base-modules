import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Save, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSelfEmployedUser,
  updateSelfEmployedUser,
  uploadSelfEmployedProfileImage,
  WizSelfEmployedUser,
} from '@/services/wizSelfEmployedService';

const WizSelfEmployedUserEdit: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<WizSelfEmployedUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getSelfEmployedUser(Number(userId));
        const d = res.data as WizSelfEmployedUser;
        setUser(d);
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setEmail(d.emailId || '');
        setProfileImage(d.profileImage || null);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await uploadSelfEmployedProfileImage(Number(userId), base64, file.name);
        setProfileImage(res.data?.profileImage || base64);
        toast.success('Profile image uploaded');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) { toast.error('First Name is required'); return; }
    if (!lastName.trim()) { toast.error('Last Name is required'); return; }
    setSaving(true);
    try {
      await updateSelfEmployedUser(Number(userId), {
        firstName,
        lastName,
        emailId: email,
      });
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
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

  return (
    <div className="space-y-4 p-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Update Self Employed User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-start gap-2">
            <div className="w-24 h-24 rounded-sm bg-muted flex items-center justify-center overflow-hidden border">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <Button
              variant="link"
              size="sm"
              className="text-primary p-0 h-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3 w-3 mr-1" />
              {uploading ? 'Uploading...' : 'Upload Profile Picture'}
            </Button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

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
              onClick={() => navigate(-1)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WizSelfEmployedUserEdit;
