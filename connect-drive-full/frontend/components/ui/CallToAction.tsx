import React from 'react';
import { cn } from '../../utils/cn';

interface CTAProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function CallToAction({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  href,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  ariaLabel,
}: CTAProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center font-semibold rounded-lg',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'relative overflow-hidden',
    {
      'w-full': fullWidth,
      'cursor-not-allowed': disabled || loading,
    }
  );

  const variantClasses = {
    primary: cn(
      'bg-gradient-to-r from-blue-600 to-blue-700 text-white',
      'hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:-translate-y-0.5',
      'focus:ring-blue-500',
      'active:transform active:scale-95'
    ),
    secondary: cn(
      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900',
      'hover:from-gray-200 hover:to-gray-300 hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-gray-500',
      'active:transform active:scale-95'
    ),
    outline: cn(
      'border-2 border-blue-600 text-blue-600 bg-transparent',
      'hover:bg-blue-600 hover:text-white hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-blue-500',
      'active:transform active:scale-95'
    ),
    ghost: cn(
      'text-blue-600 bg-transparent',
      'hover:bg-blue-50 hover:text-blue-700',
      'focus:ring-blue-500'
    ),
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm gap-1.5 min-h-[2rem]',
    md: 'px-4 py-2.5 text-sm gap-2 min-h-[2.5rem]',
    lg: 'px-6 py-3 text-base gap-2 min-h-[3rem]',
    xl: 'px-8 py-4 text-lg gap-3 min-h-[3.5rem]',
  };

  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  const content = (
    <>
      {/* Ripple effect */}
      <span className="absolute inset-0 overflow-hidden rounded-lg">
        <span className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 hover:opacity-10" />
      </span>

      {/* Loading spinner */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Icon and text */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      
      <span className="relative z-10">{children}</span>
      
      {icon && iconPosition === 'right' && !loading && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}

// Pre-built CTA components for common use cases
export function GetStartedCTA({ className, ...props }: Omit<CTAProps, 'children'>) {
  return (
    <CallToAction
      variant="primary"
      size="lg"
      className={className}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      }
      iconPosition="right"
      ariaLabel="Get started with ConnectDrive"
      {...props}
    >
      Get Started Free
    </CallToAction>
  );
}

export function UploadFilesCTA({ className, ...props }: Omit<CTAProps, 'children'>) {
  return (
    <CallToAction
      variant="primary"
      size="md"
      className={className}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      }
      ariaLabel="Upload your files"
      {...props}
    >
      Upload Files
    </CallToAction>
  );
}

export function LearnMoreCTA({ className, ...props }: Omit<CTAProps, 'children'>) {
  return (
    <CallToAction
      variant="outline"
      size="md"
      className={className}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      ariaLabel="Learn more about ConnectDrive"
      {...props}
    >
      Learn More
    </CallToAction>
  );
}

export function ContactSalesCTA({ className, ...props }: Omit<CTAProps, 'children'>) {
  return (
    <CallToAction
      variant="secondary"
      size="md"
      className={className}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      }
      ariaLabel="Contact our sales team"
      {...props}
    >
      Contact Sales
    </CallToAction>
  );
}