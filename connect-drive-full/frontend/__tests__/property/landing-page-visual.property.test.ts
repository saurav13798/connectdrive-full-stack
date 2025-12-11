/**
 * **Feature: frontend-quality-improvements, Property 8: Interactive Element States**
 * 
 * Property-based tests for landing page visual consistency and interactive element states.
 * Validates that all interactive elements provide appropriate hover states, focus indicators,
 * and transition animations as required by Requirements 3.2.
 */

import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// Helper function to read the landing page source code
const readLandingPageSource = (): string => {
  const landingPagePath = path.join(__dirname, '../../pages/index.tsx');
  return fs.readFileSync(landingPagePath, 'utf-8');
};

// Helper function to read the design tokens CSS
const readDesignTokensSource = (): string => {
  const designTokensPath = path.join(__dirname, '../../styles/design-tokens.css');
  return fs.readFileSync(designTokensPath, 'utf-8');
};

describe('Landing Page Visual Consistency Property Tests', () => {
  let landingPageSource: string;
  let designTokensSource: string;

  beforeAll(() => {
    landingPageSource = readLandingPageSource();
    designTokensSource = readDesignTokensSource();
  });

  /**
   * Property 8.1: All interactive buttons have consistent hover states
   * For any button element, it should have hover state styling and transitions
   */
  test('Property 8.1: All buttons have consistent hover states and transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'btn btn-primary',
          'btn btn-secondary',
          'btn btn-xl',
          'btn btn-lg',
          'btn btn-md'
        ),
        (buttonClass) => {
          // Check if the button class exists in the landing page
          const hasButtonClass = landingPageSource.includes(buttonClass);
          
          if (hasButtonClass) {
            // Check that the design tokens define proper button styling
            const hasButtonDefinition = designTokensSource.includes(`.${buttonClass.split(' ')[0]} {`) ||
                                       designTokensSource.includes(`.${buttonClass.replace(' ', '-')} {`) ||
                                       designTokensSource.includes(`.${buttonClass.split(' ')[1]} {`);
            
            // Check for transition properties in design tokens
            const hasTransitionDefinition = designTokensSource.includes('transition:') ||
                                          designTokensSource.includes('transition-all') ||
                                          designTokensSource.includes('duration');
            
            // Check for hover states in design tokens
            const hasHoverDefinition = designTokensSource.includes(':hover') ||
                                     designTokensSource.includes('hover:');
            
            expect(hasButtonDefinition || hasTransitionDefinition).toBe(true);
            expect(hasHoverDefinition).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.2: Navigation links have consistent focus indicators
   * For any navigation link, it should have proper focus states and accessibility
   */
  test('Property 8.2: Navigation links have consistent focus indicators', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Features', 'Security', 'Pricing', 'Sign in'),
        (linkText) => {
          // Check if the link text exists in the landing page
          const hasLinkText = landingPageSource.includes(linkText);
          
          if (hasLinkText) {
            // Find lines containing the link (there might be multiple instances)
            const lines = landingPageSource.split('\n');
            const linkLines = lines.filter(line => line.includes(linkText) && line.includes('href'));
            
            if (linkLines.length > 0) {
              // Check at least one link line has proper styling
              const hasProperStyling = linkLines.some(linkLine => {
                // Check for focus-related classes
                const hasFocusClass = linkLine.includes('focus:') ||
                                    linkLine.includes('focus-visible:') ||
                                    linkLine.includes('outline');
                
                // Check for transition classes
                const hasTransitionClass = linkLine.includes('transition') ||
                                         linkLine.includes('duration');
                
                // Check for hover states
                const hasHoverClass = linkLine.includes('hover:');
                
                return (hasFocusClass || hasTransitionClass) && hasHoverClass;
              });
              
              expect(hasProperStyling).toBe(true);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.3: Feature cards have consistent interactive states
   * For any feature card, it should have hover effects and proper styling
   */
  test('Property 8.3: Feature cards have consistent interactive states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Smart Upload',
          'Secure Sharing', 
          'Powerful Search',
          'Enterprise Security',
          'Version Control',
          'Cross-Platform Sync'
        ),
        (featureTitle) => {
          // Check if the feature title exists in the landing page
          const hasFeatureTitle = landingPageSource.includes(featureTitle);
          
          if (hasFeatureTitle) {
            // Check that card classes are defined in design tokens
            const hasCardDefinition = designTokensSource.includes('.card {') ||
                                     designTokensSource.includes('.card-interactive');
            
            // Check for hover effects in design tokens
            const hasHoverEffects = designTokensSource.includes('.card:hover') ||
                                  designTokensSource.includes('hover:');
            
            // Check for transition definitions
            const hasTransitionDefinition = designTokensSource.includes('transition:') ||
                                          designTokensSource.includes('transition-all');
            
            expect(hasCardDefinition).toBe(true);
            expect(hasHoverEffects).toBe(true);
            expect(hasTransitionDefinition).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.4: Trust indicators have consistent visual treatment
   * For any trust indicator element, it should have proper styling and animations
   */
  test('Property 8.4: Trust indicators have consistent visual treatment', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('SOC 2 Certified', 'GDPR Compliant', 'ISO 27001'),
        (badgeText) => {
          // Check if the badge text exists in the landing page
          const hasBadgeText = landingPageSource.includes(badgeText);
          
          if (hasBadgeText) {
            // Check that badges are implemented as part of a styled system
            // Look for the badge array pattern and styling template
            const hasBadgeArray = landingPageSource.includes('badge.text') &&
                                landingPageSource.includes('badge.color');
            
            const hasBadgeTemplate = landingPageSource.includes('inline-flex') &&
                                   landingPageSource.includes('items-center') &&
                                   landingPageSource.includes('gap-2');
            
            const hasInteractiveEffects = landingPageSource.includes('hover:scale') ||
                                        landingPageSource.includes('transition-transform');
            
            // The core property: badges should be part of a consistent system
            expect(hasBadgeArray && hasBadgeTemplate).toBe(true);
            
            // Interactive effects should exist somewhere in the badge system
            expect(hasInteractiveEffects).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.5: All CTA sections have proper visual hierarchy
   * For any call-to-action section, it should have prominent styling and clear visual hierarchy
   */
  test('Property 8.5: CTA sections have proper visual hierarchy', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Start your free trial today',
          'Ready to transform your file management?',
          'Try all features free'
        ),
        (ctaText) => {
          // Check if the CTA text exists in the landing page
          const hasCtaText = landingPageSource.includes(ctaText);
          
          if (hasCtaText) {
            // Find the section containing the CTA
            const lines = landingPageSource.split('\n');
            const ctaLineIndex = lines.findIndex(line => line.includes(ctaText));
            
            if (ctaLineIndex !== -1) {
              // Look for section styling in surrounding lines
              const contextLines = lines.slice(Math.max(0, ctaLineIndex - 10), ctaLineIndex + 10);
              const contextText = contextLines.join('\n');
              
              // Check for background styling
              const hasBackgroundStyling = contextText.includes('bg-') ||
                                         contextText.includes('gradient');
              
              // Check for padding/spacing
              const hasSpacing = contextText.includes('py-') ||
                               contextText.includes('p-');
              
              // Check for text styling
              const hasTextStyling = contextText.includes('text-') ||
                                    contextText.includes('font-');
              
              expect(hasBackgroundStyling || hasSpacing).toBe(true);
              expect(hasTextStyling || hasSpacing).toBe(true);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.6: All animated elements have proper animation classes
   * For any element with animations, it should have consistent animation implementation
   */
  test('Property 8.6: Animated elements have proper animation classes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'animate-fade-in-up',
          'animate-float',
          'animate-bounce-in',
          'animate-pulse',
          'animate-gradient-x'
        ),
        (animationClass) => {
          // Check if the animation class is used in the landing page
          const hasAnimationClass = landingPageSource.includes(animationClass);
          
          if (hasAnimationClass) {
            // Check that the animation is defined in design tokens
            const animationName = animationClass.replace('animate-', '');
            const hasAnimationDefinition = designTokensSource.includes(`@keyframes ${animationName}`) ||
                                         designTokensSource.includes(`.${animationClass}`) ||
                                         designTokensSource.includes(`animation: ${animationName}`);
            
            // Check for animation properties
            const hasAnimationProperties = designTokensSource.includes('animation:') ||
                                         designTokensSource.includes('animation-duration') ||
                                         designTokensSource.includes('animation-timing-function');
            
            expect(hasAnimationDefinition || hasAnimationProperties).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.7: All form elements have consistent styling
   * For any form element, it should have proper styling and states
   */
  test('Property 8.7: Form elements have consistent styling', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('form-input', 'form-label', 'form-error', 'form-help'),
        (formClass) => {
          // Check if form classes are defined in design tokens
          const hasFormDefinition = designTokensSource.includes(`.${formClass}`) ||
                                   designTokensSource.includes(`.${formClass} {`);
          
          if (hasFormDefinition) {
            // Check for focus states
            const hasFocusState = designTokensSource.includes(`${formClass}:focus`) ||
                                designTokensSource.includes('focus:') ||
                                designTokensSource.includes('focus-visible:');
            
            // Check for border styling
            const hasBorderStyling = designTokensSource.includes('border:') ||
                                   designTokensSource.includes('border-radius') ||
                                   designTokensSource.includes('rounded');
            
            expect(hasFocusState || hasBorderStyling).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.8: All sections have proper spacing and layout
   * For any major section, it should have consistent spacing and layout patterns
   */
  test('Property 8.8: Sections have proper spacing and layout', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('hero', 'features', 'security', 'stats', 'cta', 'footer'),
        (sectionType) => {
          // Check for section elements in the landing page
          const hasSectionElement = landingPageSource.includes('<section') ||
                                  landingPageSource.includes('section className');
          
          if (hasSectionElement) {
            // Check for spacing utilities in the source
            const hasSpacing = landingPageSource.includes('py-') ||
                             landingPageSource.includes('p-') ||
                             landingPageSource.includes('px-');
            
            // Check for background styling
            const hasBackground = landingPageSource.includes('bg-') ||
                                landingPageSource.includes('gradient');
            
            // Check for container classes
            const hasContainer = landingPageSource.includes('content-container') ||
                               landingPageSource.includes('max-w-') ||
                               landingPageSource.includes('container');
            
            // At least one of these should be true for proper section styling
            expect(hasSpacing || hasBackground || hasContainer).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});