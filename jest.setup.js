// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // Remove Next.js-specific props that don't belong on img elements
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, priority, quality, loading, sizes, ...imgProps } = props
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...imgProps} />
  },
}))

// Mock react-signature-canvas
jest.mock('react-signature-canvas', () => {
  return {
    __esModule: true,
    default: ({ value, onChange }) => (
      <div data-testid="signature-canvas">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          data-testid="signature-input"
        />
      </div>
    ),
  }
})
