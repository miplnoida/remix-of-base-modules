
import React from 'react';

interface SocialSecurityIconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const SocialSecurityIcon: React.FC<SocialSecurityIconProps> = ({ 
  className = "", 
  size = 24,
  style 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Shield outline */}
      <path
        d="M12 2L4 6V12C4 17.5 7.5 21.5 12 22C16.5 21.5 20 17.5 20 12V6L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* SS text inside shield */}
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill="currentColor"
      >
        SS
      </text>
      {/* Small decorative elements */}
      <circle cx="9" cy="9" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="15" cy="9" r="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
};
