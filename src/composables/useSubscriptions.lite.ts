// Lightweight subscription composable with only essential features
import { ref, readonly } from 'vue'
import type { 
  UseSubscriptionsReturn, 
  CreateSubscriptionData,
  SubscriptionStatus,
  SubscriptionConfig,
  StripeError 
} from '@/types'
import { buildApiUrl, buildRequestHeaders, getRequestTimeout } from '@/utils/config'

export function useSubscriptionsLite(
  config?: Partial<SubscriptionConfig>
): Pick<UseSubscriptionsReturn, 'createSubscription' | 'cancelSubscription' | 'retrieveSubscription' | 'loading' | 'error'> {
  const loading = ref(false)
  const error = ref<StripeError | null>(null)

  const makeRequest = async (url: string, data: any, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST'): Promise<any> => {
    const headers = buildRequestHeaders(undefined, config)
    const timeout = getRequestTimeout(undefined, config)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal
    }
    
    if (method !== 'GET') {
      fetchOptions.headers = headers
      fetchOptions.body = JSON.stringify(data)
    } else {
      const getHeaders = { ...headers }
      delete getHeaders['Content-Type']
      fetchOptions.headers = getHeaders
    }

    const response = await fetch(url, fetchOptions)
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  const createSubscription = async (
    data: CreateSubscriptionData, 
    requestConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    try {
      loading.value = true
      error.value = null

      const url = buildApiUrl('/api/stripe/create-subscription', undefined, { ...config, ...requestConfig })
      const subscription = await makeRequest(url, data)
      
      return subscription
    } catch (err) {
      const stripeError: StripeError = {
        type: 'api_error',
        message: err instanceof Error ? err.message : 'Failed to create subscription'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const cancelSubscription = async (
    subscriptionId: string,
    requestConfig?: { cancelAtPeriodEnd?: boolean } & Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    try {
      loading.value = true
      error.value = null

      const url = buildApiUrl(`/api/stripe/cancel-subscription/${subscriptionId}`, undefined, { ...config, ...requestConfig })
      const subscription = await makeRequest(url, { 
        cancel_at_period_end: requestConfig?.cancelAtPeriodEnd ?? true 
      }, 'PATCH')
      
      return subscription
    } catch (err) {
      const stripeError: StripeError = {
        type: 'api_error',
        message: err instanceof Error ? err.message : 'Failed to cancel subscription'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const retrieveSubscription = async (
    subscriptionId: string,
    requestConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    try {
      loading.value = true
      error.value = null

      const url = buildApiUrl(`/api/stripe/retrieve-subscription/${subscriptionId}`, undefined, { ...config, ...requestConfig })
      const subscription = await makeRequest(url, null, 'GET')
      
      return subscription
    } catch (err) {
      const stripeError: StripeError = {
        type: 'api_error',
        message: err instanceof Error ? err.message : 'Failed to retrieve subscription'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  return {
    createSubscription,
    cancelSubscription,
    retrieveSubscription,
    loading: readonly(loading),
    error: readonly(error)
  }
}