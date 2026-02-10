/**
 * PII Unlock Button
 * 
 * Action button to unlock PII data on a screen. 
 * Non-admin users see this button next to masked data.
 * 
 * Usage:
 *   <PIIUnlockButton profileId="SSN-123456" profileType="insured_person" />
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { usePIIMasking } from '@/contexts/PIIMaskingContext';

interface PIIUnlockButtonProps {
  profileId: string;
  profileType?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export const PIIUnlockButton: React.FC<PIIUnlockButtonProps> = ({
  profileId,
  profileType = 'insured_person',
  size = 'sm',
  variant = 'outline',
  className,
}) => {
  const { shouldMask, isProfileUnlocked, requestUnlock } = usePIIMasking();

  if (!shouldMask) return null;

  const unlocked = isProfileUnlocked(profileId);

  if (unlocked) {
    return (
      <Button variant="ghost" size={size} className={className} disabled>
        <Unlock className="h-4 w-4 mr-1" />
        Unlocked
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => requestUnlock(profileId, profileType)}
    >
      <Lock className="h-4 w-4 mr-1" />
      Unlock PII
    </Button>
  );
};
