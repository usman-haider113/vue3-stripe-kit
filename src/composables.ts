// Composables-only export (no Vue components) - ~8-10 KB
export { useStripe } from './composables/useStripe'
export { useStripeCheckout } from './composables/useStripeCheckout'
export { usePaymentElements } from './composables/usePaymentElements'
export { usePaymentIntents } from './composables/usePaymentIntents'
export { useSubscriptions } from './composables/useSubscriptions'
export { useWebhooks } from './composables/useWebhooks'

// Essential utilities
export { quickCheckout, buildLineItems } from './utils/checkout'
export { initializeStripe, getStripeInstance, resetStripeInstance } from './utils/stripe'
export { setGlobalConfig, getGlobalConfig } from './utils/config'

// All types
export type * from './types'