import { ref, readonly } from 'vue'
import type { 
  UsePaymentIntentsReturn, 
  PaymentIntentConfig, 
  PaymentIntentResponse,
  CheckoutOptions,
  StripeError 
} from '@/types'
import { getStripeInstance } from '@/utils/stripe'
import { buildApiUrl, buildRequestHeaders, getRequestTimeout, getRetryCount } from '@/utils/config'

export function usePaymentIntents(
  componentOptions?: {
    apiEndpoint?: string
    timeout?: number
    headers?: Record<string, string>
    retries?: number
  }
): UsePaymentIntentsReturn {
  const loading = ref(false)
  const error = ref<StripeError | null>(null)

  const makeRequest = async (
    url: string, 
    data: any, 
    options?: CheckoutOptions
  ): Promise<any> => {
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
          body: JSON.stringify(data),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error occurred')
        
        if (attempt === retries) {
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

  const createPaymentIntent = async (
    config: PaymentIntentConfig, 
    options?: CheckoutOptions
  ): Promise<PaymentIntentResponse> => {
    try {
      loading.value = true
      error.value = null

      // Validate required fields
      if (!config.amount || config.amount <= 0) {
        throw new Error('amount must be a positive integer')
      }

      if (!config.currency) {
        throw new Error('currency is required')
      }

      // Build URL - try to use payment intents endpoint
      let url: string
      try {
        url = buildApiUrl('/api/stripe/create-payment-intent', options, componentOptions)
      } catch {
        // Fallback to custom endpoint if provided
        if (options?.apiEndpoint) {
          url = options.apiEndpoint
        } else {
          throw new Error(
            'No Payment Intent API endpoint configured. Please provide one of:\n' +
            '1. Global config: app.use(Vue3StripeKit, { apiBaseUrl: "...", paymentIntentEndpoint: "..." })\n' +
            '2. Component config: usePaymentIntents({ apiEndpoint: "..." })\n' +
            '3. Per-call config: createPaymentIntent(config, { apiEndpoint: "..." })'
          )
        }
      }

      const response = await makeRequest(url, config, options)

      console.log('✅ Payment Intent created:', response.id)
      return response

    } catch (err) {
      const stripeError: StripeError = {
        type: 'api_error',
        message: err instanceof Error ? err.message : 'Failed to create payment intent'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const confirmPaymentIntent = async (
    clientSecret: string, 
    paymentMethod?: any
  ): Promise<any> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe) {
        throw new Error('Stripe not initialized. Please call useStripe() first.')
      }

      if (!clientSecret) {
        throw new Error('clientSecret is required')
      }

      let confirmParams: any = {}

      if (paymentMethod) {
        if (typeof paymentMethod === 'string') {
          // Payment method ID
          confirmParams.payment_method = paymentMethod
        } else if (paymentMethod.id) {
          // Payment method object
          confirmParams.payment_method = paymentMethod.id
        } else {
          // Payment method data
          confirmParams.payment_method = paymentMethod
        }
      }

      const result = await stripe.confirmPayment({
        clientSecret,
        confirmParams,
        redirect: 'if_required'
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      console.log('✅ Payment Intent confirmed:', result.paymentIntent?.id)
      return result

    } catch (err) {
      const stripeError: StripeError = {
        type: 'confirmation_error',
        message: err instanceof Error ? err.message : 'Failed to confirm payment intent'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const retrievePaymentIntent = async (clientSecret: string): Promise<any> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe) {
        throw new Error('Stripe not initialized. Please call useStripe() first.')
      }

      if (!clientSecret) {
        throw new Error('clientSecret is required')
      }

      const { paymentIntent, error: retrieveError } = await stripe.retrievePaymentIntent(clientSecret)

      if (retrieveError) {
        throw new Error(retrieveError.message)
      }

      console.log('✅ Payment Intent retrieved:', paymentIntent?.id)
      return paymentIntent

    } catch (err) {
      const stripeError: StripeError = {
        type: 'retrieval_error',
        message: err instanceof Error ? err.message : 'Failed to retrieve payment intent'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  return {
    createPaymentIntent,
    confirmPaymentIntent,
    retrievePaymentIntent,
    loading: readonly(loading),
    error: readonly(error)
  }
}