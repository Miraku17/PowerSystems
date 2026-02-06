import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPage from '../page'
import { useAuthStore } from '@/stores/authStore'
import apiClient from '@/lib/axios'
import { authService } from '@/services'
import toast from 'react-hot-toast'

// Mock dependencies
jest.mock('@/stores/authStore')
jest.mock('@/lib/axios')
jest.mock('@/services')
jest.mock('react-hot-toast')

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

describe('AuthPage - Login Form', () => {
  const mockSetUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ setUser: mockSetUser })
    )
    ;(toast.loading as jest.Mock).mockReturnValue('toast-id')
    ;(toast.success as jest.Mock).mockReturnValue(undefined)
    ;(toast.error as jest.Mock).mockReturnValue(undefined)
  })

  describe('Rendering', () => {
    it('renders the login page with all essential elements', () => {
      render(<AuthPage />)

      // Check for branding elements (desktop) - there are multiple instances
      const brandElements = screen.getAllByText('Power Systems Inc.')
      expect(brandElements.length).toBeGreaterThan(0)
      expect(screen.getByText(/Powering smarter/i)).toBeInTheDocument()

      // Check for form elements
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders the forgot password link', () => {
      render(<AuthPage />)

      const forgotPasswordLink = screen.getByText(/forgot password/i)
      expect(forgotPasswordLink).toBeInTheDocument()
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })

    it('renders feature highlights on desktop', () => {
      render(<AuthPage />)

      expect(screen.getByText(/Real-time monitoring & analytics/i)).toBeInTheDocument()
      expect(screen.getByText(/Enterprise-grade security/i)).toBeInTheDocument()
      expect(screen.getByText(/Comprehensive reporting tools/i)).toBeInTheDocument()
    })

    it('renders logo images', () => {
      render(<AuthPage />)

      const logos = screen.getAllByAltText('Power Systems Inc')
      expect(logos.length).toBeGreaterThan(0)
    })
  })

  describe('Form Interactions', () => {
    it('allows typing in email input', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      await user.type(emailInput, 'test@example.com')

      expect(emailInput.value).toBe('test@example.com')
    })

    it('allows typing in password input', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      await user.type(passwordInput, 'password123')

      expect(passwordInput.value).toBe('password123')
    })

    it('toggles password visibility when eye icon is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      expect(passwordInput.type).toBe('password')

      // Find and click the password visibility toggle button
      const toggleButton = passwordInput.nextElementSibling as HTMLButtonElement
      await user.click(toggleButton)

      expect(passwordInput.type).toBe('text')

      await user.click(toggleButton)
      expect(passwordInput.type).toBe('password')
    })

    it('requires email and password fields', () => {
      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })
  })

  describe('Form Submission - Success', () => {
    it('submits the form successfully with valid credentials', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        data: {
          success: true,
          data: {
            access_token: 'mock-token-123',
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
            },
          },
        },
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)

      render(<AuthPage />)

      // Fill in the form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify API was called
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        })
      })

      // Verify auth service was called
      expect(authService.saveToken).toHaveBeenCalledWith('mock-token-123')
      expect(authService.saveUser).toHaveBeenCalledWith(mockResponse.data.data.user)

      // Verify Zustand store was updated
      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockResponse.data.data.user)
      })

      // Verify success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Login successful! Redirecting...',
          { id: 'toast-id' }
        )
      })

      // Verify redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/overview')
      }, { timeout: 1000 })
    })

    it('displays loading state during submission', async () => {
      const user = userEvent.setup()
      ;(apiClient.post as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Check for loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Submission - Errors', () => {
    it('displays error message when login fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid email or password'
      const mockResponse = {
        data: {
          success: false,
          message: errorMessage,
        },
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage, { id: 'toast-id' })
      })

      // Error should be displayed in the UI
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      const networkError = {
        response: {
          data: {
            message: 'Network error occurred',
          },
        },
      }

      ;(apiClient.post as jest.Mock).mockRejectedValue(networkError)

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error occurred', {
          id: 'toast-id',
        })
      })
    })

    it('handles unexpected errors with generic message', async () => {
      const user = userEvent.setup()
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('Unexpected error'))

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Unexpected error', {
          id: 'toast-id',
        })
      })
    })

    it('re-enables submit button after error', async () => {
      const user = userEvent.setup()
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('Error'))

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Button should be enabled after error
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for form inputs', () => {
      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('has accessible button text', () => {
      render(<AuthPage />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('provides helpful placeholder text', () => {
      render(<AuthPage />)

      expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument()
    })
  })

  describe('UI/UX Features', () => {
    it('displays copyright information', () => {
      render(<AuthPage />)

      const currentYear = new Date().getFullYear()
      const copyrightText = screen.getAllByText(
        new RegExp(`© ${currentYear} Power Systems Inc\\.`, 'i')
      )
      expect(copyrightText.length).toBeGreaterThan(0)
    })

    it('maintains form data when toggling password visibility', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      await user.type(passwordInput, 'mypassword')

      expect(passwordInput.value).toBe('mypassword')

      const toggleButton = passwordInput.nextElementSibling as HTMLButtonElement
      await user.click(toggleButton)

      // Password value should remain
      expect(passwordInput.value).toBe('mypassword')
    })
  })
})
