import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  show: boolean;
  onComplete?: () => void;
  duration?: number;
  message?: string;
}

export default function SuccessAnimation({
  show,
  onComplete,
  duration = 1500,
  message = 'Step completed'
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Small delay for DOM to update before animating
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        "transition-opacity duration-300",
        isAnimating ? "opacity-100" : "opacity-0"
      )}
    >
      <div 
        className={cn(
          "flex flex-col items-center gap-4 p-8 rounded-lg",
          "transition-all duration-300 ease-out",
          isAnimating ? "scale-100 opacity-100" : "scale-75 opacity-0"
        )}
      >
        <div 
          className={cn(
            "w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center",
            "transition-transform duration-500 ease-out",
            isAnimating ? "scale-100" : "scale-50"
          )}
        >
          <Check 
            className={cn(
              "w-10 h-10 text-primary stroke-[3]",
              "transition-all duration-300 delay-200",
              isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )} 
          />
        </div>
        <p 
          className={cn(
            "text-lg font-medium text-foreground",
            "transition-all duration-300 delay-300",
            isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
