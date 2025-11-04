import { ref, readonly } from 'vue'
import type { UseStripeReturn, StripeConfig, StripeError } from '@/types'
import type { StripeElements } from '@stripe/stripe-js'
import { initializeStripe, getStripeInstance } from '@/utils/stripe'

export function useStripe(config?: StripeConfig): UseStripeReturn {
  const stripe = ref(getStripeInstance())
  const elements = ref<StripeElements | null>(null)
  const loading = ref(false)
  const error = ref<StripeError | null>(null)

  const initialize = async (stripeConfig: StripeConfig) => {
    try {
      loading.value = true
      error.value = null
      
      const stripeInstance = await initializeStripe(stripeConfig)
      stripe.value = stripeInstance
      
      if (!stripeInstance) {
        throw new Error('Failed to initialize Stripe')
      }
      
    } catch (err) {
      error.value = {
        type: 'initialization_error',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      }
    } finally {
      loading.value = false
    }
  }

  const createElements = (options: any = {}) => {
    if (!stripe.value) {
      console.warn('Stripe not initialized. Call initialize() first.')
      return null
    }
    
    const elementsInstance = stripe.value.elements(options)
    elements.value = elementsInstance
    return elementsInstance
  }

  if (config) {
    initialize(config)
  }

  return {
    stripe: readonly(stripe),
    elements: readonly(elements),
    loading: readonly(loading),
    error: readonly(error),
    createElements
  }
}