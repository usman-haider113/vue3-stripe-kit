// Checkout-only export (3-4 KB)
export { useStripeCheckout } from './composables/useStripeCheckout'
export { quickCheckout, buildLineItems } from './utils/checkout'

// Essential types for checkout
export type {
  CheckoutSessionConfig,
  CheckoutOptions,
  UseStripeCheckoutReturn,
  UseStripeCheckoutOptions,
  StripeCheckoutResponse,
  StripeError
} from './types'

// Core Stripe initialization (needed for checkout)
export { useStripe } from './composables/useStripe'
export { initializeStripe, getStripeInstance } from './utils/stripe'
export type { StripeConfig, UseStripeReturn } from './types'