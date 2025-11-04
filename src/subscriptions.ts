// Full Subscription Management (8-10 KB)
export { useSubscriptions } from './composables/useSubscriptions'

// Subscription Vue Component
export { default as StripeSubscriptionManager } from './components/StripeSubscriptionManager.vue'

// All subscription types
export type {
  UseSubscriptionsReturn,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionStatus,
  SubscriptionConfig,
  SubscriptionItem,
  PriceData,
  ProductData,
  TrialSettings,
  StripeError
} from './types'

// Core utilities
export { getGlobalConfig, setGlobalConfig } from './utils/config'