/**
 * PII Unlock Dialog
 * 
 * Reusable dialog that prompts the user to enter their password
 * to temporarily unlock PII data for a specific profile.
 * 
 * Usage:
 *   import { PIIUnlockDialog } from '@/components/security/PIIUnlockDialog';
 *   // Place in component tree - it auto-shows when requestUnlock is called
 *   <PIIUnlockDialog />
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Eye } from 'lucide-react';
import { usePIIMasking } from '@/contexts/PIIMaskingContext';
import { toast } from 'sonner';

export const PIIUnlockDialog: React.FC = () => {
  const { unlockingProfileId, handleUnlockSubmit, cancelUnlock } = usePIIMasking();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isOpen = !!unlockingProfileId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await handleUnlockSubmit(password);
      if (success) {
        toast.success('PII data unlocked successfully', {
          description: 'Sensitive information is now temporarily visible.',
        });
        setPassword('');
      } else {
        toast.error('Authentication failed', {
          description: 'Incorrect password. This attempt has been logged.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    cancelUnlock();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Unlock PII Information
          </DialogTitle>
          <DialogDescription>
            Enter your login password to temporarily view sensitive personal information. 
            This action will be recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pii-password">Password</Label>
              <div className="relative">
                <Input
                  id="pii-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !password.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unlock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
