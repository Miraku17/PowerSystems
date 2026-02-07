# Test Suite for Submersible Pump Teardown Attachment Management

This document describes the comprehensive test suite created for the new attachment management features in the Submersible Pump Teardown Report.

## Overview

The test suite covers two main areas:
1. **API Route Tests** - Testing the attachments endpoint
2. **Component Tests** - Testing the EditSubmersiblePumpTeardown component

**Note:** PDF generation is tested manually to ensure proper formatting and page breaks.

## Test Files

### 1. API Route Tests
**Location:** `src/app/api/forms/submersible-pump-teardown/attachments/__tests__/route.test.ts`

#### Test Coverage:
- ✅ **Update existing attachment titles**
  - Updates file names for existing attachments
  - Handles multiple attachments

- ✅ **Delete attachments**
  - Deletes attachments from storage
  - Deletes attachment records from database
  - Handles missing attachments gracefully

- ✅ **Upload new attachments**
  - Uploads files with correct categories (pre_teardown, wet_end, motor)
  - Sanitizes filenames before upload
  - Skips empty files
  - Handles upload errors

- ✅ **Combined operations**
  - Handles delete, update, and upload in single request

- ✅ **Error handling**
  - Returns 500 on internal server errors
  - Handles database connection failures

#### Running API Tests:
```bash
npm test -- attachments/__tests__/route.test.ts
```

---

### 2. Component Tests
**Location:** `src/components/__tests__/EditSubmersiblePumpTeardown.test.tsx`

#### Test Coverage:

##### Rendering
- ✅ Renders edit form with all sections
- ✅ Displays existing attachments grouped by category
- ✅ Fetches and displays users for signature fields

##### Form Interactions
- ✅ Allows editing text fields
- ✅ Closes modal when close button is clicked

##### Attachment Management
- ✅ **Edit attachment names**
  - Allows renaming existing attachments
  - Persists changes to state

- ✅ **Delete attachments**
  - Removes attachments from view
  - Marks attachments for deletion

- ✅ **Upload new attachments**
  - Accepts image files
  - Shows "New" badge for new attachments
  - Allows adding titles to new attachments

- ✅ **Validation**
  - Rejects non-image files
  - Shows error toast for invalid files

- ✅ **Remove new attachments**
  - Allows removing newly added attachments before saving

##### Form Submission
- ✅ **Submit updated data**
  - Sends PATCH request with form data
  - Includes attachment changes

- ✅ **Loading states**
  - Shows loading indicator during submission
  - Disables submit button

- ✅ **Success handling**
  - Calls onSaved and onClose callbacks
  - Shows success toast

- ✅ **Error handling**
  - Displays error messages
  - Keeps modal open on error

##### Integration Tests
- ✅ **Multiple operations**
  - Handles editing, deleting, and adding attachments in one submission

#### Running Component Tests:
```bash
npm test -- EditSubmersiblePumpTeardown.test.tsx
```

---

## Running All Tests

### Run all tests:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Run tests with coverage:
```bash
npm run test:coverage
```

## Test Statistics

- **Total Test Suites:** 2
- **Total Tests:** ~30+
- **Coverage Areas:**
  - API Routes
  - React Components
  - Error Handling
  - User Interactions

**Manual Testing:**
- PDF Generation (page breaks, formatting, attachments)

## Mocked Dependencies

The following dependencies are mocked in tests:
- `@/lib/supabase` - Database operations
- `@/lib/axios` - HTTP client
- `@/lib/auth-middleware` - Authentication
- `@/lib/utils` - Utility functions
- `react-hot-toast` - Toast notifications
- `jspdf` - PDF generation
- `next/navigation` - Next.js routing

## Coverage Goals

- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

## Testing Best Practices Applied

1. **Arrange-Act-Assert Pattern** - Clear test structure
2. **Isolated Tests** - Each test is independent
3. **Mocking External Dependencies** - No real API calls
4. **Descriptive Test Names** - Clear test purposes
5. **Edge Case Coverage** - Tests for error scenarios
6. **Integration Tests** - Tests combining multiple operations

## Future Test Improvements

- [ ] Add E2E tests with Playwright/Cypress
- [ ] Add visual regression tests for PDF output
- [ ] Add performance tests for large file uploads
- [ ] Add accessibility tests (a11y)
- [ ] Increase code coverage to > 90%

## Troubleshooting

### Common Issues:

1. **Tests fail due to missing mocks**
   - Ensure all external dependencies are properly mocked
   - Check jest.setup.js for global mocks

2. **TypeScript errors in tests**
   - Use `as any` for complex mock types when needed
   - Ensure test files have correct TypeScript configuration

3. **Async tests timing out**
   - Use `waitFor` for async operations
   - Increase timeout if needed: `jest.setTimeout(10000)`

## Contributing

When adding new features:
1. Write tests before implementation (TDD)
2. Ensure all tests pass before committing
3. Aim for > 80% code coverage
4. Update this document with new test information

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
