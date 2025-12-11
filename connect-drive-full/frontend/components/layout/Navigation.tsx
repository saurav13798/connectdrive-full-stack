import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '../../utils/cn';

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: NavigationItem[];
}

interface NavigationProps {
  items: NavigationItem[];
  className?: string;
  variant?: 'sidebar' | 'header' | 'mobile';
  onItemClick?: () => void;
}

const defaultNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Files',
    href: '/files',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    ),
    children: [
      { name: 'All Files', href: '/files' },
      { name: 'Recent', href: '/files/recent' },
      { name: 'Shared', href: '/files/shared' },
      { name: 'Trash', href: '/files/trash' },
    ],
  },
  {
    name: 'Upload',
    href: '/upload',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    name: 'Organization',
    href: '/organization',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export function Navigation({ 
  items = defaultNavigationItems, 
  className, 
  variant = 'sidebar',
  onItemClick 
}: NavigationProps) {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  const isExpanded = (itemName: string) => {
    return expandedItems.includes(itemName);
  };

  const baseClasses = cn(
    'navigation',
    {
      'navigation-sidebar': variant === 'sidebar',
      'navigation-header': variant === 'header',
      'navigation-mobile': variant === 'mobile',
    },
    className
  );

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.href);
    const expanded = isExpanded(item.name);

    const itemClasses = cn(
      'nav-item group',
      {
        'active': active,
        'has-children': hasChildren,
        'expanded': expanded,
        'nav-item-level-1': level === 1,
      }
    );

    return (
      <div key={item.name} className="nav-item-container">
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.name)}
            className={itemClasses}
            aria-expanded={expanded}
            aria-controls={`nav-submenu-${item.name}`}
          >
            <span className="nav-item-content">
              {item.icon && (
                <span className="nav-item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="nav-item-text">{item.name}</span>
              {item.badge && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </span>
            <svg
              className={cn(
                'nav-item-chevron transition-transform duration-200',
                { 'rotate-90': expanded }
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <Link
            href={item.href}
            className={itemClasses}
            {...(onItemClick && { onClick: onItemClick })}
            aria-current={active ? 'page' : undefined}
          >
            <span className="nav-item-content">
              {item.icon && (
                <span className="nav-item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="nav-item-text">{item.name}</span>
              {item.badge && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </span>
          </Link>
        )}

        {hasChildren && (
          <div
            id={`nav-submenu-${item.name}`}
            className={cn(
              'nav-submenu',
              {
                'nav-submenu-expanded': expanded,
                'nav-submenu-collapsed': !expanded,
              }
            )}
            aria-hidden={!expanded}
          >
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={baseClasses} role="navigation" aria-label="Main navigation">
      <div className="nav-items">
        {items.map(item => renderNavigationItem(item))}
      </div>
    </nav>
  );
}

// Breadcrumb Navigation Component
interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('breadcrumb', className)} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="breadcrumb-link">
                {item.name}
              </Link>
            ) : (
              <span className="breadcrumb-current" aria-current="page">
                {item.name}
              </span>
            )}
            {index < items.length - 1 && (
              <svg
                className="breadcrumb-separator"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Mobile Navigation Menu
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: NavigationItem[];
}

export function MobileMenu({ isOpen, onClose, items = defaultNavigationItems }: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="Mobile navigation">
      <div className="mobile-menu-backdrop" onClick={onClose} />
      <div className="mobile-menu-panel">
        <div className="mobile-menu-header">
          <h2 className="mobile-menu-title">Navigation</h2>
          <button
            onClick={onClose}
            className="mobile-menu-close"
            aria-label="Close navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mobile-menu-content">
          <Navigation 
            items={items} 
            variant="mobile" 
            onItemClick={onClose}
          />
        </div>
      </div>
    </div>
  );
}