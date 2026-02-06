# Login Page Tests

This directory contains comprehensive unit tests for the login page component.

## Test Coverage

The test suite covers the following scenarios:

### 1. Rendering
- ✅ All essential UI elements (branding, form inputs, buttons)
- ✅ Feature highlights on desktop view
- ✅ Forgot password link
- ✅ Logo images

### 2. Form Interactions
- ✅ Email input field interaction
- ✅ Password input field interaction
- ✅ Password visibility toggle
- ✅ Required field validation

### 3. Form Submission - Success Cases
- ✅ Successful login with valid credentials
- ✅ Token storage via authService
- ✅ User state update in Zustand store
- ✅ Success toast notification
- ✅ Redirect to dashboard
- ✅ Loading state during submission

### 4. Form Submission - Error Cases
- ✅ Display error message on login failure
- ✅ Handle network errors gracefully
- ✅ Handle unexpected errors with generic message
- ✅ Re-enable submit button after error

### 5. Accessibility
- ✅ Proper ARIA labels for inputs
- ✅ Accessible button text
- ✅ Helpful placeholder text

### 6. UI/UX Features
- ✅ Copyright information display
- ✅ Form data persistence during password toggle

## Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 80%
- **Functions**: > 80%
- **Lines**: > 80%

## CI/CD Integration

Tests are automatically run in the GitLab CI/CD pipeline on every commit. The pipeline:
1. Installs dependencies
2. Runs unit tests with coverage reporting
3. Uploads coverage reports as artifacts
4. Fails the pipeline if tests fail

## Mocked Dependencies

The following dependencies are mocked in the test setup:
- `next/navigation` (useRouter)
- `next/image`
- `@/stores/authStore`
- `@/lib/axios`
- `@/services/auth`
- `react-hot-toast`

## Test Files

- `page.test.tsx` - Main test suite for the login page component
