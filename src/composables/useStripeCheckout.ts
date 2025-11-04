import { ref, readonly } from 'vue'
import type { UseStripeCheckoutReturn, UseStripeCheckoutOptions, CheckoutSessionConfig, StripeCheckoutResponse, StripeError, CheckoutOptions } from '@/types'
import { getStripeInstance } from '@/utils/stripe'
import { buildApiUrl, buildRequestHeaders, getRequestTimeout, getRetryCount } from '@/utils/config'

export function useStripeCheckout(componentOptions?: UseStripeCheckoutOptions): UseStripeCheckoutReturn {
  const loading = ref(false)
  const error = ref<StripeError | null>(null)

  const makeRequest = async (url: string, config: CheckoutSessionConfig, options?: CheckoutOptions): Promise<StripeCheckoutResponse> => {
    const headers = buildRequestHeaders(options, componentOptions)
    const timeout = getRequestTimeout(options, componentOptions)
    const retries = getRetryCount(options, componentOptions)
    
    let lastError: Error
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(config),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        const session: StripeCheckoutResponse = await response.json()
        return session
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error occurred')
        
        if (attempt === retries) {
          // Last attempt failed
          break
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }
    
    throw lastError!
  }

  const createCheckoutSession = async (config: CheckoutSessionConfig, options?: CheckoutOptions): Promise<StripeCheckoutResponse> => {
    try {
      loading.value = true
      error.value = null

      const url = buildApiUrl(undefined, options, componentOptions)
      const session = await makeRequest(url, config, options)
      return session

    } catch (err) {
      const stripeError: StripeError = {
        type: 'api_error',
        message: err instanceof Error ? err.message : 'Failed to create checkout session'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const redirectToCheckout = async (sessionId: string): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe) {
        throw new Error('Stripe not initialized. Please call useStripe() first.')
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId
      })

      if (redirectError) {
        throw new Error(redirectError.message)
      }

    } catch (err) {
      const stripeError: StripeError = {
        type: 'redirect_error',
        message: err instanceof Error ? err.message : 'Failed to redirect to checkout'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  return {
    createCheckoutSession,
    redirectToCheckout,
    loading: readonly(loading),
    error: readonly(error)
  }
}