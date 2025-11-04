import type { App } from 'vue'
import { setGlobalConfig } from './utils/config'
import { initializeStripe } from './utils/stripe'

// Types
export * from './types'

// Composables
export { useStripe } from './composables/useStripe'
export { useStripeCheckout } from './composables/useStripeCheckout'
export { usePaymentElements } from './composables/usePaymentElements'
export { usePaymentIntents } from './composables/usePaymentIntents'
export { useSubscriptions } from './composables/useSubscriptions'
export { useWebhooks } from './composables/useWebhooks'

// Components
export { default as StripePaymentElement } from './components/StripePaymentElement.vue'
export { default as StripeExpressCheckout } from './components/StripeExpressCheckout.vue'
export { default as StripeSubscriptionManager } from './components/StripeSubscriptionManager.vue'
export { default as StripeWebhookMonitor } from './components/StripeWebhookMonitor.vue'

// Utils
export { initializeStripe, getStripeInstance, resetStripeInstance } from './utils/stripe'
export { quickCheckout, buildLineItems } from './utils/checkout'
export { setGlobalConfig, getGlobalConfig } from './utils/config'

// Plugin
export interface StripePluginOptions {
  publishableKey: string
  apiVersion?: string
  locale?: string
  stripeAccount?: string
  // API Configuration (no hardcoded values!)
  apiBaseUrl?: string
  checkoutEndpoint?: string
  // Request Configuration
  requestTimeout?: number
  headers?: Record<string, string>
}

export default {
  install(app: App, options: StripePluginOptions) {
    // Validate required options
    if (!options.publishableKey) {
      throw new Error('Vue3StripeKit: publishableKey is required')
    }

    // Set global configuration
    setGlobalConfig({
      publishableKey: options.publishableKey,
      apiVersion: options.apiVersion,
      locale: options.locale,
      stripeAccount: options.stripeAccount,
      apiBaseUrl: options.apiBaseUrl,
      checkoutEndpoint: options.checkoutEndpoint,
      requestTimeout: options.requestTimeout,
      headers: options.headers
    })

    // Automatically initialize Stripe when plugin is installed globally
    initializeStripe({
      publishableKey: options.publishableKey,
      apiVersion: options.apiVersion,
      locale: options.locale,
      stripeAccount: options.stripeAccount
    }).catch(error => {
      console.warn('Vue3StripeKit: Failed to auto-initialize Stripe:', error)
    })

    // Global properties for backwards compatibility
    app.config.globalProperties.$stripe = {
      publishableKey: options.publishableKey,
      apiVersion: options.apiVersion,
      locale: options.locale,
      stripeAccount: options.stripeAccount,
      apiBaseUrl: options.apiBaseUrl,
      checkoutEndpoint: options.checkoutEndpoint
    }

    // Provide global config
    app.provide('stripeConfig', options)
  }
}