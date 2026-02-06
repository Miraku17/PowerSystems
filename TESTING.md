# Testing Documentation

## Overview

This document describes the testing setup and practices for the Power Systems Inc frontend application.

## Test Framework

The application uses **Jest** as the test runner with **React Testing Library** for component testing.

### Dependencies

- `jest` (v29.7.0) - Test runner
- `jest-environment-jsdom` (v29.7.0) - DOM environment for testing
- `@testing-library/react` (v16.1.0) - React component testing utilities
- `@testing-library/jest-dom` (v6.6.3) - Custom Jest matchers for DOM assertions
- `@testing-library/user-event` (v14.5.2) - User interaction simulation

## Running Tests

### Available Commands

```bash
# Run tests once
npm test

# Run tests in watch mode (interactive)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### CI/CD Integration

Tests are automatically executed in the GitLab CI/CD pipeline:

1. **Install Stage** - Dependencies are installed and cached
2. **Test Stage** - Unit tests run with coverage reporting
3. **Build Stage** - Application builds only if tests pass
4. **Deploy Stage** - Deployment occurs only if all previous stages succeed

## Test Coverage

### Current Coverage

The login page test suite achieves **100% coverage** for the login component with 19 passing tests covering:

- ✅ Component rendering (4 tests)
- ✅ Form interactions (4 tests)
- ✅ Successful submissions (2 tests)
- ✅ Error handling (4 tests)
- ✅ Accessibility (3 tests)
- ✅ UI/UX features (2 tests)

### Coverage Reports

Coverage reports are generated in the following formats:

- **Text** - Console output during test runs
- **LCOV** - HTML report in `coverage/lcov-report/index.html`
- **Cobertura** - XML format for GitLab CI integration

### Viewing Coverage Reports

After running `npm run test:coverage`, open the HTML report:

```bash
open coverage/lcov-report/index.html
```

## Test Structure

### File Organization

```
src/
├── app/
│   └── login/
│       ├── page.tsx           # Login component
│       └── __tests__/
│           ├── page.test.tsx  # Test suite
│           └── README.md      # Test documentation
├── jest.config.js             # Jest configuration
└── jest.setup.js              # Global test setup
```

### Test File Naming

- Component tests: `*.test.tsx` or `*.spec.tsx`
- Test utilities: `*.test-utils.ts`
- Test data: `*.fixtures.ts`

## Mocking Strategy

### Global Mocks (jest.setup.js)

The following are mocked globally for all tests:

1. **next/navigation** - Router hooks
2. **next/image** - Image component

### Test-Specific Mocks

Individual test files mock:

- API clients (`@/lib/axios`)
- Authentication services (`@/services/auth`)
- State management stores (`@/stores/*`)
- Third-party libraries (`react-hot-toast`)

## Writing Tests

### Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what users see and do
   - Avoid testing internal component state
   - Use accessible queries (getByRole, getByLabelText)

2. **Follow AAA Pattern**
   - **Arrange** - Set up test data and mocks
   - **Act** - Perform user interactions
   - **Assert** - Verify expected outcomes

3. **Use User-Centric Queries**
   ```tsx
   // ✅ Good - queries by accessible role/label
   screen.getByRole('button', { name: /sign in/i })
   screen.getByLabelText(/email/i)

   // ❌ Bad - queries by implementation details
   screen.getByClassName('submit-button')
   screen.getByTestId('email-input')
   ```

4. **Handle Async Operations**
   ```tsx
   // Use waitFor for async assertions
   await waitFor(() => {
     expect(mockFunction).toHaveBeenCalled()
   })
   ```

5. **Clean Up After Tests**
   ```tsx
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

### Example Test Structure

```tsx
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, clear state
  })

  describe('Feature Group', () => {
    it('should do something when user does something', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<Component />)

      // Act
      await user.click(screen.getByRole('button'))

      // Assert
      expect(screen.getByText(/success/i)).toBeInTheDocument()
    })
  })
})
```

## Debugging Tests

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --testNamePattern="login"

# Run a specific file
npm test -- src/app/login/__tests__/page.test.tsx
```

### Debugging in VS Code

Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

1. **Tests timing out**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for missing `await` on async operations

2. **Mocks not working**
   - Ensure mocks are defined before imports
   - Use `jest.clearAllMocks()` in beforeEach

3. **State persists between tests**
   - Reset all mocks and state in beforeEach
   - Consider using `afterEach` for cleanup

## CI/CD Pipeline

### GitLab CI Configuration

The `.gitlab-ci.yml` file defines the test pipeline:

```yaml
unit-test:
  stage: test
  script:
    - npm run test -- --ci --coverage --maxWorkers=2
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

### Pipeline Stages

1. **install-dependencies** - Install npm packages
2. **unit-test** - Run tests with coverage
3. **lint-test** - Run ESLint (allows failures)
4. **build-job** - Build Next.js application
5. **deploy-staging** - Deploy to staging (staging branch only)
6. **deploy-production** - Deploy to production (main branch only)

### Coverage Reporting

- Coverage reports are uploaded as GitLab artifacts
- Coverage percentage is extracted and displayed in merge requests
- Reports are retained for 30 days

## Future Enhancements

### Planned Improvements

1. **Integration Tests**
   - Add end-to-end tests with Playwright or Cypress
   - Test complete user flows across multiple pages

2. **Visual Regression Testing**
   - Implement snapshot testing for UI components
   - Use tools like Chromatic or Percy

3. **Performance Testing**
   - Add performance benchmarks for critical paths
   - Monitor bundle size and render times

4. **Accessibility Testing**
   - Integrate axe-core for automated a11y testing
   - Add keyboard navigation tests

5. **API Mocking**
   - Use MSW (Mock Service Worker) for consistent API mocking
   - Create reusable mock data factories

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)

## Support

For testing-related questions or issues:

1. Check the test documentation in `__tests__/README.md` files
2. Review existing test files for examples
3. Consult the team's testing standards document
4. Open an issue in the project repository
