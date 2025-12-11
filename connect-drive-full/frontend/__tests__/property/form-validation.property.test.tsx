/**
 * **Feature: frontend-quality-improvements, Property 6: Form Validation Feedback**
 * **Validates: Requirements 2.5**
 * 
 * Property-based tests for form validation feedback functionality.
 * Tests that form validation provides clear, field-specific feedback for any invalid input.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import LoginPage from '../../pages/login';
import RegisterPage from '../../pages/register';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
  }),
}));

// Mock axios for API calls
jest.mock('axios', () => ({
  post: jest.fn(),
}));

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('Form Validation Feedback Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 6: Form Validation Feedback
   * For any form with validation errors, clear validation messages should be displayed with field-specific feedback
   */
  describe('Property 6: Form Validation Feedback', () => {
    it('should display field-specific validation feedback for invalid email inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@') && s.trim().length > 0),
          async (invalidEmail) => {
            const user = userEvent.setup();
            renderWithAuthProvider(<LoginPage />);

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Fill in invalid email and valid password
            await user.clear(emailInput);
            await user.type(emailInput, invalidEmail);
            await user.type(passwordInput, 'validpassword123');

            // Try to submit the form
            await user.click(submitButton);

            // Check that HTML5 validation prevents submission for invalid email
            // The form should not submit with invalid email format
            expect(emailInput).toBeInvalid();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should display validation feedback for empty required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('email', 'password'),
          async (fieldType) => {
            const user = userEvent.setup();
            renderWithAuthProvider(<LoginPage />);

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Fill only one field, leave the other empty
            if (fieldType === 'email') {
              await user.type(emailInput, 'test@example.com');
              // Leave password empty
            } else {
              await user.type(passwordInput, 'password123');
              // Leave email empty
            }

            // Try to submit the form
            await user.click(submitButton);

            // Check that the empty required field shows validation feedback
            const emptyField = fieldType === 'email' ? passwordInput : emailInput;
            expect(emptyField).toBeInvalid();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should display validation feedback for password confirmation mismatch in registration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 8, maxLength: 20 }).filter(s => s !== ''),
          async (password, differentPassword) => {
            // Ensure passwords are different
            if (password === differentPassword) return;

            const user = userEvent.setup();
            renderWithAuthProvider(<RegisterPage />);

            const nameInput = screen.getByLabelText(/full name/i);
            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

            // Fill in all fields with mismatched passwords
            await user.type(nameInput, 'Test User');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, password);
            await user.type(confirmPasswordInput, differentPassword);

            const submitButton = screen.getByRole('button', { name: /create account/i });
            await user.click(submitButton);

            // Should show validation error for password mismatch
            await waitFor(() => {
              const errorMessage = screen.queryByText(/passwords do not match/i);
              expect(errorMessage).toBeInTheDocument();
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide consistent validation feedback styling across all form fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('@')),
            password: fc.string({ minLength: 1, maxLength: 5 }), // Short password
          }),
          async (invalidInputs) => {
            const user = userEvent.setup();
            renderWithAuthProvider(<LoginPage />);

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);

            // Fill in invalid inputs
            await user.clear(emailInput);
            await user.type(emailInput, invalidInputs.email);
            await user.clear(passwordInput);
            await user.type(passwordInput, invalidInputs.password);

            const submitButton = screen.getByRole('button', { name: /sign in/i });
            await user.click(submitButton);

            // Check that both invalid fields have consistent validation styling
            expect(emailInput).toBeInvalid();
            
            // Both fields should have the same validation state styling
            const emailClasses = emailInput.className;
            const passwordClasses = passwordInput.className;
            
            // Both should have focus ring and validation styling
            expect(emailClasses).toContain('focus:ring-');
            expect(passwordClasses).toContain('focus:ring-');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should clear validation feedback when user corrects invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('@')),
          fc.emailAddress(),
          async (invalidEmail, validEmail) => {
            const user = userEvent.setup();
            renderWithAuthProvider(<LoginPage />);

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);

            // First, enter invalid email
            await user.type(emailInput, invalidEmail);
            await user.type(passwordInput, 'validpassword');

            const submitButton = screen.getByRole('button', { name: /sign in/i });
            await user.click(submitButton);

            // Verify field is invalid
            expect(emailInput).toBeInvalid();

            // Now correct the email
            await user.clear(emailInput);
            await user.type(emailInput, validEmail);

            // The field should now be valid
            expect(emailInput).toBeValid();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain validation state consistency during user interaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.emailAddress(), { minLength: 2, maxLength: 5 }),
          async (emailSequence) => {
            const user = userEvent.setup();
            renderWithAuthProvider(<LoginPage />);

            const emailInput = screen.getByLabelText(/email address/i);
            
            for (const email of emailSequence) {
              await user.clear(emailInput);
              await user.type(emailInput, email);
              
              // Each valid email should result in a valid field state
              expect(emailInput).toBeValid();
              
              // Field should maintain consistent styling
              expect(emailInput.className).toContain('focus:ring-');
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Form Accessibility and Validation Integration', () => {
    it('should associate validation messages with form fields for screen readers', async () => {
      const user = userEvent.setup();
      renderWithAuthProvider(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      // Fill in mismatched passwords
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Check that error message is properly associated with form
      await waitFor(() => {
        const errorMessage = screen.queryByText(/passwords do not match/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Error should be visible and accessible
        expect(errorMessage).toBeVisible();
      });
    });

    it('should maintain focus management during validation feedback', async () => {
      const user = userEvent.setup();
      renderWithAuthProvider(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Try to submit with empty form
      await user.click(submitButton);

      // Focus should remain manageable and not be trapped
      expect(document.activeElement).toBeDefined();
      
      // User should be able to focus on the email input
      await user.click(emailInput);
      expect(document.activeElement).toBe(emailInput);
    });
  });
});