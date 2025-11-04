// Payment Elements export (5-6 KB)
export { usePaymentElements } from './composables/usePaymentElements'
export { usePaymentIntents } from './composables/usePaymentIntents'

// Elements Vue Components
export { default as StripePaymentElement } from './components/StripePaymentElement.vue'
export { default as StripeExpressCheckout } from './components/StripeExpressCheckout.vue'

// Essential types for elements
export type {
  UsePaymentElementsReturn,
  UsePaymentIntentsReturn,
  PaymentElementOptions,
  ExpressCheckoutElementOptions,
  ElementsOptions,
  ElementsAppearance,
  ElementsTheme,
  PaymentIntentConfig,
  PaymentIntentResponse,
  StripeError
} from './types'

// Core Stripe (needed for elements)
export { useStripe } from './composables/useStripe'
export { initializeStripe, getStripeInstance } from './utils/stripe'
export type { StripeConfig, UseStripeReturn } from './types'