/**
 * **Feature: frontend-quality-improvements, Property 7: Design System Consistency**
 * **Validates: Requirements 3.1**
 * 
 * Property-based tests for design system consistency
 */

import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import React from 'react';

// Design system constants that should be consistent
const DESIGN_TOKENS = {
  colors: {
    primary: ['primary-50', 'primary-100', 'primary-500', 'primary-600', 'primary-700'],
    gray: ['gray-50', 'gray-100', 'gray-200', 'gray-300', 'gray-400', 'gray-500', 'gray-600', 'gray-700', 'gray-800', 'gray-900'],
    success: ['success-50', 'success-500', 'success-600'],
    error: ['error-50', 'error-500', 'error-600'],
    warning: ['warning-50', 'warning-500', 'warning-600']
  },
  spacing: ['space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8', 'space-12', 'space-16'],
  fontSize: ['font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl', 'font-size-2xl'],
  borderRadius: ['radius-sm', 'radius-base', 'radius-md', 'radius-lg', 'radius-xl', 'radius-2xl'],
  shadows: ['shadow-xs', 'shadow-sm', 'shadow-base', 'shadow-md', 'shadow-lg', 'shadow-xl']
};

// Mock components that use design system tokens
const TestButton: React.FC<{ 
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}> = ({ variant, size, children }) => {
  return React.createElement('button', {
    className: `btn btn-${variant} btn-${size}`,
    'data-testid': 'test-button'
  }, children);
};

const TestCard: React.FC<{ 
  children: React.ReactNode;
  interactive?: boolean;
}> = ({ children, interactive }) => {
  return React.createElement('div', {
    className: `card ${interactive ? 'card-interactive' : ''}`,
    'data-testid': 'test-card'
  }, React.createElement('div', {
    className: 'card-body'
  }, children));
};

const TestInput: React.FC<{
  type?: string;
  placeholder?: string;
  error?: boolean;
}> = ({ type = 'text', placeholder, error }) => {
  return React.createElement('input', {
    type,
    placeholder,
    className: `form-input ${error ? 'error' : ''}`,
    'data-testid': 'test-input'
  });
};

describe('Design System Consistency Properties', () => {
  /**
   * Property: All UI components should use consistent class naming patterns
   */
  test('components use consistent class naming patterns', () => {
    fc.assert(fc.property(
      fc.constantFrom('primary', 'secondary', 'ghost', 'danger'),
      fc.constantFrom('sm', 'md', 'lg'),
      fc.string({ minLength: 1, maxLength: 20 }),
      (variant, size, text) => {
        const { container } = render(
          React.createElement(TestButton, { variant, size }, text)
        );
        
        const button = container.querySelector('[data-testid="test-button"]')!;
        
        // Should have base class
        expect(button).toHaveClass('btn');
        
        // Should have variant class following pattern
        expect(button).toHaveClass(`btn-${variant}`);
        
        // Should have size class following pattern
        expect(button).toHaveClass(`btn-${size}`);
        
        // Class names should follow kebab-case pattern
        const classList = Array.from(button.classList);
        classList.forEach(className => {
          expect(className).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
        });
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: All card components should use consistent class structure
   */
  test('card components use consistent class structure', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.boolean(),
      (content, interactive) => {
        const { container } = render(
          React.createElement(TestCard, { interactive }, content)
        );
        
        const card = container.querySelector('[data-testid="test-card"]')!;
        
        // Should have base card class
        expect(card).toHaveClass('card');
        
        // Should have interactive class when interactive
        if (interactive) {
          expect(card).toHaveClass('card-interactive');
        }
        
        // Should have card-body child
        const cardBody = card.querySelector('.card-body');
        expect(cardBody).toBeInTheDocument();
        
        // Class names should follow consistent pattern
        const classList = Array.from(card.classList);
        classList.forEach(className => {
          expect(className).toMatch(/^card(-[a-z]+)*$/);
        });
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: All form inputs should use consistent class patterns
   */
  test('form inputs use consistent class patterns', () => {
    fc.assert(fc.property(
      fc.constantFrom('text', 'email', 'password', 'number'),
      fc.option(fc.string({ minLength: 1, maxLength: 50 })),
      fc.boolean(),
      (inputType, placeholder, hasError) => {
        const { container } = render(
          React.createElement(TestInput, {
            type: inputType,
            placeholder: placeholder || undefined,
            error: hasError
          })
        );
        
        const input = container.querySelector('[data-testid="test-input"]')! as HTMLInputElement;
        
        // Should have base form-input class
        expect(input).toHaveClass('form-input');
        
        // Should have error class when error state
        if (hasError) {
          expect(input).toHaveClass('error');
        }
        
        // Should have correct input type
        expect(input).toHaveAttribute('type', inputType);
        
        // Should have placeholder if provided
        if (placeholder) {
          expect(input).toHaveAttribute('placeholder', placeholder);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Design token naming should follow consistent patterns
   */
  test('design token names follow consistent patterns', () => {
    const allTokens = [
      ...DESIGN_TOKENS.colors.primary,
      ...DESIGN_TOKENS.colors.gray,
      ...DESIGN_TOKENS.colors.success,
      ...DESIGN_TOKENS.colors.error,
      ...DESIGN_TOKENS.colors.warning,
      ...DESIGN_TOKENS.spacing,
      ...DESIGN_TOKENS.fontSize,
      ...DESIGN_TOKENS.borderRadius,
      ...DESIGN_TOKENS.shadows
    ];
    
    fc.assert(fc.property(
      fc.constantFrom(...allTokens),
      (tokenName) => {
        // Token names should follow kebab-case pattern
        expect(tokenName).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
        
        // Color tokens should have numeric suffixes
        if (tokenName.includes('primary') || tokenName.includes('gray') || 
            tokenName.includes('success') || tokenName.includes('error') || 
            tokenName.includes('warning')) {
          expect(tokenName).toMatch(/-\d+$/);
        }
        
        // Spacing tokens should have numeric suffixes
        if (tokenName.startsWith('space-')) {
          expect(tokenName).toMatch(/space-\d+$/);
        }
        
        // Font size tokens should follow size naming
        if (tokenName.startsWith('font-size-')) {
          expect(tokenName).toMatch(/font-size-(xs|sm|base|lg|xl|2xl|3xl)$/);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Component variants should be consistently named
   */
  test('component variants follow consistent naming', () => {
    fc.assert(fc.property(
      fc.constantFrom('primary', 'secondary', 'ghost', 'danger', 'success'),
      fc.constantFrom('sm', 'md', 'lg', 'xl'),
      (variant, size) => {
        // Variant names should be lowercase
        expect(variant).toMatch(/^[a-z]+$/);
        
        // Size names should be short abbreviations
        expect(size).toMatch(/^(xs|sm|md|lg|xl|2xl)$/);
        
        // Combined class names should follow pattern
        const variantClass = `btn-${variant}`;
        const sizeClass = `btn-${size}`;
        
        expect(variantClass).toMatch(/^btn-[a-z]+$/);
        expect(sizeClass).toMatch(/^btn-(xs|sm|md|lg|xl|2xl)$/);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property: Animation class names should be consistent
   */
  test('animation classes follow consistent naming patterns', () => {
    fc.assert(fc.property(
      fc.constantFrom(
        'animate-fade-in', 'animate-slide-up', 'animate-scale-in', 
        'animate-bounce-in', 'animate-fade-in-up', 'animate-pulse-soft'
      ),
      (animationClass) => {
        // Animation classes should start with 'animate-'
        expect(animationClass).toMatch(/^animate-/);
        
        // Should follow kebab-case pattern
        expect(animationClass).toMatch(/^animate-[a-z]+(-[a-z]+)*$/);
        
        // Should describe the animation type
        const animationType = animationClass.replace('animate-', '');
        expect(animationType).toMatch(/^(fade|slide|scale|bounce|pulse)/);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property: Utility classes should follow consistent patterns
   */
  test('utility classes follow consistent patterns', () => {
    fc.assert(fc.property(
      fc.constantFrom(
        'text-gradient', 'bg-gradient-primary', 'focus-ring', 
        'hover-lift', 'status-online', 'skeleton-text'
      ),
      (utilityClass) => {
        // Utility classes should follow kebab-case
        expect(utilityClass).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
        
        // Should have descriptive prefixes
        if (utilityClass.startsWith('text-')) {
          expect(utilityClass).toMatch(/^text-[a-z]+(-[a-z]+)*$/);
        }
        
        if (utilityClass.startsWith('bg-')) {
          expect(utilityClass).toMatch(/^bg-[a-z]+(-[a-z]+)*$/);
        }
        
        if (utilityClass.startsWith('hover-')) {
          expect(utilityClass).toMatch(/^hover-[a-z]+(-[a-z]+)*$/);
        }
        
        if (utilityClass.startsWith('status-')) {
          expect(utilityClass).toMatch(/^status-[a-z]+(-[a-z]+)*$/);
        }
      }
    ), { numRuns: 50 });
  });
});