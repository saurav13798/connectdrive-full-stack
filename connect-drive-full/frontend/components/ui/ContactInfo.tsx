import React from 'react';
import { cn } from '../../utils/cn';

interface ContactMethod {
  type: 'email' | 'phone' | 'address' | 'social';
  label: string;
  value: string;
  href?: string;
  icon: React.ReactNode;
}

interface ContactInfoProps {
  variant?: 'card' | 'inline' | 'footer';
  showTitle?: boolean;
  className?: string;
  methods?: ContactMethod[];
}

const defaultContactMethods: ContactMethod[] = [
  {
    type: 'email',
    label: 'Email Support',
    value: 'support@connectdrive.com',
    href: 'mailto:support@connectdrive.com',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'phone',
    label: 'Phone Support',
    value: '+1 (555) 123-4567',
    href: 'tel:+15551234567',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    type: 'address',
    label: 'Office Address',
    value: '123 Cloud Street, Tech City, TC 12345',
    href: 'https://maps.google.com/?q=123+Cloud+Street+Tech+City+TC+12345',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const socialLinks: ContactMethod[] = [
  {
    type: 'social',
    label: 'Twitter',
    value: '@connectdrive',
    href: 'https://twitter.com/connectdrive',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>
    ),
  },
  {
    type: 'social',
    label: 'LinkedIn',
    value: 'ConnectDrive',
    href: 'https://linkedin.com/company/connectdrive',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
];

export function ContactInfo({ 
  variant = 'card', 
  showTitle = true, 
  className,
  methods = defaultContactMethods 
}: ContactInfoProps) {
  const containerClasses = cn(
    'contact-info',
    {
      'contact-info-card': variant === 'card',
      'contact-info-inline': variant === 'inline',
      'contact-info-footer': variant === 'footer',
    },
    className
  );

  const renderContactMethod = (method: ContactMethod) => {
    const content = (
      <div className="contact-method">
        <div className="contact-method-icon">
          {method.icon}
        </div>
        <div className="contact-method-content">
          <div className="contact-method-label">{method.label}</div>
          <div className="contact-method-value">{method.value}</div>
        </div>
      </div>
    );

    if (method.href) {
      return (
        <a
          key={method.type + method.value}
          href={method.href}
          className="contact-method-link"
          target={method.type === 'social' ? '_blank' : undefined}
          rel={method.type === 'social' ? 'noopener noreferrer' : undefined}
          aria-label={`${method.label}: ${method.value}`}
        >
          {content}
        </a>
      );
    }

    return (
      <div key={method.type + method.value} className="contact-method-static">
        {content}
      </div>
    );
  };

  return (
    <div className={containerClasses}>
      {showTitle && (
        <h3 className="contact-info-title">Get in Touch</h3>
      )}
      
      <div className="contact-methods">
        {methods.map(renderContactMethod)}
      </div>

      {variant !== 'footer' && (
        <div className="contact-social">
          <h4 className="contact-social-title">Follow Us</h4>
          <div className="contact-social-links">
            {socialLinks.map(social => (
              <a
                key={social.value}
                href={social.href}
                className="contact-social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow us on ${social.label}`}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      )}

      {variant === 'card' && (
        <div className="contact-info-footer">
          <p className="contact-info-hours">
            <strong>Support Hours:</strong><br />
            Monday - Friday: 9:00 AM - 6:00 PM EST<br />
            Saturday: 10:00 AM - 4:00 PM EST
          </p>
        </div>
      )}
    </div>
  );
}

// Quick Contact Component
interface QuickContactProps {
  className?: string;
}

export function QuickContact({ className }: QuickContactProps) {
  return (
    <div className={cn('quick-contact', className)}>
      <div className="quick-contact-content">
        <h3 className="quick-contact-title">Need Help?</h3>
        <p className="quick-contact-description">
          Our support team is here to help you get the most out of ConnectDrive.
        </p>
        <div className="quick-contact-actions">
          <a
            href="mailto:support@connectdrive.com"
            className="btn btn-primary btn-sm"
          >
            Email Support
          </a>
          <a
            href="/help"
            className="btn btn-secondary btn-sm"
          >
            Help Center
          </a>
        </div>
      </div>
    </div>
  );
}

// Emergency Contact Component
export function EmergencyContact() {
  return (
    <div className="emergency-contact">
      <div className="emergency-contact-icon">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div className="emergency-contact-content">
        <h4 className="emergency-contact-title">Critical Issues?</h4>
        <p className="emergency-contact-description">
          For urgent technical issues affecting your business operations:
        </p>
        <a
          href="tel:+15551234567"
          className="emergency-contact-phone"
        >
          +1 (555) 123-4567
        </a>
        <p className="emergency-contact-note">
          Available 24/7 for enterprise customers
        </p>
      </div>
    </div>
  );
}