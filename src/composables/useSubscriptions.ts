import { ref } from 'vue'
import type { 
  UseSubscriptionsReturn,
  SubscriptionConfig,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionStatus,
  StripeError 
} from '../types/index'
import { getGlobalConfig, buildRequestHeaders } from '../utils/config'

export function useSubscriptions(config: Partial<SubscriptionConfig> = {}): UseSubscriptionsReturn {
  const loading = ref(false)
  const error = ref<StripeError | null>(null)

  // Get global configuration and merge with local config
  const globalConfig = getGlobalConfig()
  const mergedConfig = { ...globalConfig, ...config }

  // Default endpoints (configurable)
  const getEndpoint = (key: keyof SubscriptionConfig, defaultPath: string, subscriptionConfig?: Partial<SubscriptionConfig>) => {
    const finalConfig = { ...mergedConfig, ...subscriptionConfig }
    const endpoint = finalConfig[key]
    
    if (typeof endpoint === 'string') {
      return endpoint
    }
    
    // Build URL from base URL + path
    if (finalConfig.apiBaseUrl) {
      return `${finalConfig.apiBaseUrl}${defaultPath}`
    }
    
    // Fallback to just the path (assume full URL provided elsewhere)
    return defaultPath
  }

  // Generic API request handler with retry logic
  const makeRequest = async <T>(
    endpoint: string,
    options: RequestInit,
    retries = 3
  ): Promise<T> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), mergedConfig.requestTimeout || 30000)

    try {
      const response = await fetch(endpoint, {
        ...options,
        signal: controller.signal,
        headers: buildRequestHeaders(mergedConfig, options.headers as Record<string, string>)
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
        throw {
          type: 'api_error',
          code: response.status.toString(),
          message: errorData.message || `HTTP ${response.status}`,
        } as StripeError
      }

      return await response.json()
    } catch (err: any) {
      clearTimeout(timeoutId)
      
      if (err.name === 'AbortError') {
        throw {
          type: 'timeout_error',
          message: 'Request timeout',
        } as StripeError
      }

      if (retries > 0 && !err.type) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
        return makeRequest(endpoint, options, retries - 1)
      }

      throw err
    }
  }

  // Subscription Management Functions
  const createSubscription = async (
    data: CreateSubscriptionData,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('createEndpoint', '/api/stripe/subscriptions', subscriptionConfig)
      
      // Apply defaults
      const finalConfig = { ...mergedConfig, ...subscriptionConfig }
      const payload = {
        ...data,
        payment_behavior: data.payment_behavior || finalConfig.defaultPaymentBehavior || 'default_incomplete',
        collection_method: data.collection_method || finalConfig.defaultCollectionMethod || 'charge_automatically',
        proration_behavior: data.proration_behavior || finalConfig.defaultProrationBehavior || 'create_prorations',
      }

      // Add trial defaults if not specified
      if (finalConfig.defaultTrialDays && !payload.trial_period_days) {
        payload.trial_period_days = finalConfig.defaultTrialDays
      }

      const result = await makeRequest<SubscriptionStatus>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSubscription = async (
    subscriptionId: string,
    data: UpdateSubscriptionData,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('updateEndpoint', `/api/stripe/subscriptions/${subscriptionId}`, subscriptionConfig)
      
      const finalConfig = { ...mergedConfig, ...subscriptionConfig }
      const payload = {
        ...data,
        payment_behavior: data.payment_behavior || finalConfig.defaultPaymentBehavior || 'default_incomplete',
        proration_behavior: data.proration_behavior || finalConfig.defaultProrationBehavior || 'create_prorations',
      }

      const result = await makeRequest<SubscriptionStatus>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancelSubscription = async (
    subscriptionId: string,
    subscriptionConfig?: { cancelAtPeriodEnd?: boolean; cancellationReason?: string } & Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('cancelEndpoint', `/api/stripe/subscriptions/${subscriptionId}/cancel`, subscriptionConfig)
      
      const finalConfig = { ...mergedConfig, ...subscriptionConfig }
      const payload = {
        cancel_at_period_end: subscriptionConfig?.cancelAtPeriodEnd ?? finalConfig.cancelAtPeriodEnd ?? false,
        cancellation_reason: subscriptionConfig?.cancellationReason || finalConfig.cancellationReason,
        metadata: {
          canceled_by: 'customer',
          canceled_at: new Date().toISOString(),
          ...(subscriptionConfig?.cancellationReason && { reason: subscriptionConfig.cancellationReason })
        }
      }

      const result = await makeRequest<SubscriptionStatus>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const retrieveSubscription = async (
    subscriptionId: string,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('retrieveEndpoint', `/api/stripe/subscriptions/${subscriptionId}`, subscriptionConfig)
      
      const result = await makeRequest<SubscriptionStatus>(endpoint, {
        method: 'GET'
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const listSubscriptions = async (
    params?: { customer?: string; price?: string; status?: string; limit?: number },
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<{ data: SubscriptionStatus[]; has_more: boolean }> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('listEndpoint', '/api/stripe/subscriptions', subscriptionConfig)
      const queryParams = new URLSearchParams()
      
      if (params?.customer) queryParams.append('customer', params.customer)
      if (params?.price) queryParams.append('price', params.price)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.limit) queryParams.append('limit', params.limit.toString())

      const finalEndpoint = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint

      const result = await makeRequest<{ data: SubscriptionStatus[]; has_more: boolean }>(finalEndpoint, {
        method: 'GET'
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // Trial Management Functions
  const startTrial = async (
    subscriptionId: string,
    trialEnd: number | Date,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    const trialEndTimestamp = trialEnd instanceof Date ? Math.floor(trialEnd.getTime() / 1000) : trialEnd
    
    return updateSubscription(subscriptionId, {
      trial_end: trialEndTimestamp,
      proration_behavior: 'none' // Don't charge during trial start
    }, subscriptionConfig)
  }

  const endTrial = async (
    subscriptionId: string,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    return updateSubscription(subscriptionId, {
      trial_end: 'now'
    }, subscriptionConfig)
  }

  const extendTrial = async (
    subscriptionId: string,
    additionalDays: number,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    const finalConfig = { ...mergedConfig, ...subscriptionConfig }
    
    if (!finalConfig.allowTrialExtension) {
      throw {
        type: 'invalid_request_error',
        message: 'Trial extension is not allowed in current configuration'
      } as StripeError
    }

    // Get current subscription to calculate new trial end
    const currentSubscription = await retrieveSubscription(subscriptionId, subscriptionConfig)
    
    if (!currentSubscription.trial_end) {
      throw {
        type: 'invalid_request_error',
        message: 'Subscription is not currently in trial'
      } as StripeError
    }

    const newTrialEnd = currentSubscription.trial_end + (additionalDays * 24 * 60 * 60)
    
    return updateSubscription(subscriptionId, {
      trial_end: newTrialEnd,
      proration_behavior: 'none'
    }, subscriptionConfig)
  }

  // Plan Change Functions
  const changePlan = async (
    subscriptionId: string,
    newPriceId: string,
    subscriptionConfig?: { prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice' } & Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    // Get current subscription to update items
    const currentSubscription = await retrieveSubscription(subscriptionId, subscriptionConfig)
    
    const updatedItems = currentSubscription.items.data.map(item => ({
      id: item.id,
      price: newPriceId,
      quantity: item.quantity
    }))

    return updateSubscription(subscriptionId, {
      items: updatedItems,
      proration_behavior: subscriptionConfig?.prorationBehavior || 'create_prorations'
    }, subscriptionConfig)
  }

  const addItem = async (
    subscriptionId: string,
    priceId: string,
    quantity = 1,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    // Get current subscription items
    const currentSubscription = await retrieveSubscription(subscriptionId, subscriptionConfig)
    
    const existingItems = currentSubscription.items.data.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))

    const newItems = [
      ...existingItems,
      { price: priceId, quantity }
    ]

    return updateSubscription(subscriptionId, {
      items: newItems
    }, subscriptionConfig)
  }

  const removeItem = async (
    subscriptionId: string,
    itemId: string,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    return updateSubscription(subscriptionId, {
      items: [{ id: itemId, deleted: true }]
    }, subscriptionConfig)
  }

  const updateQuantity = async (
    subscriptionId: string,
    itemId: string,
    quantity: number,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    return updateSubscription(subscriptionId, {
      items: [{ id: itemId, quantity }]
    }, subscriptionConfig)
  }

  // Renewal Management
  const resumeSubscription = async (
    subscriptionId: string,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    return updateSubscription(subscriptionId, {
      cancel_at_period_end: false,
      cancel_at: undefined
    }, subscriptionConfig)
  }

  const pauseSubscription = async (
    subscriptionId: string,
    pauseBehavior?: { behavior: 'mark_uncollectible' | 'keep_as_draft' | 'void' },
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<SubscriptionStatus> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('pauseEndpoint', `/api/stripe/subscriptions/${subscriptionId}/pause`, subscriptionConfig)
      
      const payload = {
        behavior: pauseBehavior?.behavior || 'mark_uncollectible'
      }

      const result = await makeRequest<SubscriptionStatus>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // Invoice Management
  const getUpcomingInvoice = async (
    customerId: string,
    subscriptionId?: string,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<any> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('retrieveUpcomingInvoiceEndpoint', '/api/stripe/invoices/upcoming', subscriptionConfig)
      const queryParams = new URLSearchParams({ customer: customerId })
      if (subscriptionId) queryParams.append('subscription', subscriptionId)

      const result = await makeRequest<any>(`${endpoint}?${queryParams}`, {
        method: 'GET'
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const payInvoice = async (
    invoiceId: string,
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<any> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('payInvoiceEndpoint', `/api/stripe/invoices/${invoiceId}/pay`, subscriptionConfig)
      
      const result = await makeRequest<any>(endpoint, {
        method: 'POST'
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // Customer Management
  const createCustomer = async (
    data: { email?: string; name?: string; payment_method?: string; metadata?: Record<string, string> },
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<any> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('createCustomerEndpoint', '/api/stripe/customers', subscriptionConfig)
      
      const result = await makeRequest<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCustomer = async (
    customerId: string,
    data: { email?: string; name?: string; metadata?: Record<string, string> },
    subscriptionConfig?: Partial<SubscriptionConfig>
  ): Promise<any> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('updateCustomerEndpoint', `/api/stripe/customers/${customerId}`, subscriptionConfig)
      
      const result = await makeRequest<any>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // Utility Functions
  const isTrialing = (subscription: SubscriptionStatus): boolean => {
    return subscription.status === 'trialing'
  }

  const isActive = (subscription: SubscriptionStatus): boolean => {
    return ['active', 'trialing'].includes(subscription.status)
  }

  const isCanceled = (subscription: SubscriptionStatus): boolean => {
    return subscription.status === 'canceled'
  }

  const isPastDue = (subscription: SubscriptionStatus): boolean => {
    return subscription.status === 'past_due'
  }

  const daysUntilRenewal = (subscription: SubscriptionStatus): number => {
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = subscription.current_period_end
    const diffInSeconds = periodEnd - now
    return Math.max(0, Math.ceil(diffInSeconds / (24 * 60 * 60)))
  }

  const daysRemainingInTrial = (subscription: SubscriptionStatus): number => {
    if (!subscription.trial_end || subscription.status !== 'trialing') {
      return 0
    }
    
    const now = Math.floor(Date.now() / 1000)
    const diffInSeconds = subscription.trial_end - now
    return Math.max(0, Math.ceil(diffInSeconds / (24 * 60 * 60)))
  }

  return {
    // State
    loading,
    error,

    // Subscription management
    createSubscription,
    updateSubscription,
    cancelSubscription,
    retrieveSubscription,
    listSubscriptions,

    // Trial management
    startTrial,
    endTrial,
    extendTrial,

    // Plan changes
    changePlan,
    addItem,
    removeItem,
    updateQuantity,

    // Renewal management
    resumeSubscription,
    pauseSubscription,

    // Invoice management
    getUpcomingInvoice,
    payInvoice,

    // Customer management
    createCustomer,
    updateCustomer,

    // Utility functions
    isTrialing,
    isActive,
    isCanceled,
    isPastDue,
    daysUntilRenewal,
    daysRemainingInTrial
  }
}