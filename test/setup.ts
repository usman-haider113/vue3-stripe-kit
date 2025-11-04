import { vi } from 'vitest'

// Mock Stripe
global.Stripe = vi.fn(() => ({
  elements: vi.fn(),
  redirectToCheckout: vi.fn(),
  confirmPayment: vi.fn(),
  retrievePaymentIntent: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

// Mock DOM methods
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  },
  writable: true
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})