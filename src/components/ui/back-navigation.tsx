import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BackNavigationProps {
  to?: string;
  onClick?: () => void;
  variant?: 'ghost' | 'outline';
  size?: 'sm' | 'default';
  backText?: string;
  breadcrumbs?: BreadcrumbItem[];
  rightContent?: React.ReactNode;
  className?: string;
}

export const BackNavigation: React.FC<BackNavigationProps> = ({
  to,
  onClick,
  variant = 'ghost',
  size = 'sm',
  backText = 'Back',
  breadcrumbs = [],
  rightContent,
  className,
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`bg-white shadow-sm border-b ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Button
              variant={variant}
              size={size}
              onClick={handleBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {backText}
            </Button>
            
            {breadcrumbs.length > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <nav className="flex items-center space-x-2 text-sm text-gray-500">
                  {breadcrumbs.map((item, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <span>/</span>}
                      {item.current ? (
                        <span className="text-gray-900 font-medium">{item.label}</span>
                      ) : item.href ? (
                        <button
                          onClick={() => navigate(item.href!)}
                          className="hover:text-gray-700 transition-colors"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              </>
            )}
          </div>
          
          {rightContent && (
            <div className="flex items-center space-x-2">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
