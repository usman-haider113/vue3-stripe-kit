import { ref, onUnmounted } from 'vue'
import type { 
  UseWebhooksReturn,
  WebhookConfig,
  WebhookEvent,
  WebhookEndpoint,
  WebhookEventHandler,
  WebhookEventType,
  WebhookStats,
  StripeError 
} from '../types/index'
import { getGlobalConfig, buildRequestHeaders } from '../utils/config'

export function useWebhooks(config: Partial<WebhookConfig> = {}): UseWebhooksReturn {
  const loading = ref(false)
  const error = ref<StripeError | null>(null)
  const events = ref<WebhookEvent[]>([])
  const stats = ref<WebhookStats>({
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    eventsByType: {} as Record<WebhookEventType, number>
  })
  const isMonitoring = ref(false)

  // Get global configuration and merge with local config
  const globalConfig = getGlobalConfig()
  const mergedConfig = { ...globalConfig, ...config }

  // Event handlers registry
  const eventHandlers = new Map<WebhookEventType, WebhookEventHandler>()
  let monitoringInterval: number | null = null

  // Default endpoints (configurable)
  const getEndpoint = (key: keyof WebhookConfig, defaultPath: string, webhookConfig?: Partial<WebhookConfig>) => {
    const finalConfig = { ...mergedConfig, ...webhookConfig }
    const endpoint = finalConfig[key]
    
    if (typeof endpoint === 'string') {
      return endpoint
    }
    
    // Build URL from base URL + path
    if (finalConfig.apiBaseUrl) {
      return `${finalConfig.apiBaseUrl}${defaultPath}`
    }
    
    // Fallback to just the path
    return defaultPath
  }

  // Generic API request handler
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

  // ===== WEBHOOK ENDPOINT MANAGEMENT =====

  const createWebhookEndpoint = async (
    url: string,
    enabledEvents: WebhookEventType[],
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<WebhookEndpoint> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('createWebhookEndpoint', '/api/stripe/webhook_endpoints', webhookConfig)
      
      const payload = {
        url,
        enabled_events: enabledEvents,
        description: `Webhook endpoint for ${url}`,
        metadata: {}
      }

      const result = await makeRequest<WebhookEndpoint>(endpoint, {
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

  const updateWebhookEndpoint = async (
    endpointId: string,
    updates: Partial<WebhookEndpoint>,
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<WebhookEndpoint> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('updateWebhookEndpoint', `/api/stripe/webhook_endpoints/${endpointId}`, webhookConfig)
      
      const result = await makeRequest<WebhookEndpoint>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })

      return result
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteWebhookEndpoint = async (
    endpointId: string,
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('deleteWebhookEndpoint', `/api/stripe/webhook_endpoints/${endpointId}`, webhookConfig)
      
      await makeRequest<void>(endpoint, {
        method: 'DELETE'
      })
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const listWebhookEndpoints = async (
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<WebhookEndpoint[]> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('listWebhookEndpoint', '/api/stripe/webhook_endpoints', webhookConfig)
      
      const result = await makeRequest<{ data: WebhookEndpoint[] }>(endpoint, {
        method: 'GET'
      })

      return result.data
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===== EVENT MONITORING =====

  const fetchEvents = async (
    limit = 100,
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<WebhookEvent[]> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('listEventsEndpoint', '/api/stripe/events', webhookConfig)
      const queryParams = new URLSearchParams({ limit: limit.toString() })

      const result = await makeRequest<{ data: WebhookEvent[] }>(`${endpoint}?${queryParams}`, {
        method: 'GET'
      })

      // Update events and stats
      events.value = result.data
      updateStats(result.data)

      return result.data
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchEvent = async (
    eventId: string,
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<WebhookEvent> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('retrieveEventEndpoint', `/api/stripe/events/${eventId}`, webhookConfig)
      
      const result = await makeRequest<WebhookEvent>(endpoint, {
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

  const resendEvent = async (
    eventId: string,
    endpointId: string,
    webhookConfig?: Partial<WebhookConfig>
  ): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const endpoint = getEndpoint('resendEventEndpoint', `/api/stripe/events/${eventId}/resend`, webhookConfig)
      
      await makeRequest<void>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ endpoint_id: endpointId })
      })
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===== REAL-TIME MONITORING =====

  const startMonitoring = (webhookConfig?: Partial<WebhookConfig>) => {
    if (isMonitoring.value) return

    const finalConfig = { ...mergedConfig, ...webhookConfig }
    const interval = finalConfig.pollingInterval || 5000 // Default 5 seconds

    isMonitoring.value = true
    
    monitoringInterval = window.setInterval(async () => {
      try {
        const newEvents = await fetchEvents(finalConfig.maxEvents || 50, webhookConfig)
        
        // Process new events with registered handlers
        newEvents.forEach(event => {
          const handler = eventHandlers.get(event.type)
          if (handler) {
            try {
              handler.handler(event)
            } catch (error) {
              console.error(`Error in webhook handler for ${event.type}:`, error)
            }
          }
        })
      } catch (error) {
        console.error('Error fetching webhook events:', error)
      }
    }, interval)

    console.log('✅ Webhook monitoring started with interval:', interval)
  }

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
    isMonitoring.value = false
    console.log('⏹️ Webhook monitoring stopped')
  }

  // ===== EVENT HANDLERS =====

  const registerEventHandler = (handler: WebhookEventHandler) => {
    eventHandlers.set(handler.eventType, handler)
    console.log(`✅ Registered webhook handler for ${handler.eventType}`)
  }

  const unregisterEventHandler = (eventType: WebhookEventType) => {
    eventHandlers.delete(eventType)
    console.log(`❌ Unregistered webhook handler for ${eventType}`)
  }

  const clearEventHandlers = () => {
    eventHandlers.clear()
    console.log('🗑️ Cleared all webhook handlers')
  }

  // ===== TESTING & DEBUGGING =====

  const simulateEvent = async (
    eventType: WebhookEventType,
    testData?: any
  ): Promise<WebhookEvent> => {
    const simulatedEvent: WebhookEvent = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: testData || generateTestData(eventType)
      },
      livemode: false,
      pending_webhooks: 0
    }

    // Add to events list
    events.value.unshift(simulatedEvent)
    updateStats([...events.value])

    // Trigger handler if registered
    const handler = eventHandlers.get(eventType)
    if (handler) {
      await handler.handler(simulatedEvent)
    }

    console.log('🧪 Simulated webhook event:', eventType)
    return simulatedEvent
  }

  const testWebhookEndpoint = async (
    endpointId: string,
    eventType: WebhookEventType
  ): Promise<boolean> => {
    try {
      loading.value = true
      const testEvent = await simulateEvent(eventType)
      await resendEvent(testEvent.id, endpointId)
      return true
    } catch (error) {
      console.error('Webhook endpoint test failed:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  const validateWebhookSignature = (
    payload: string,
    signature: string,
    secret: string
  ): boolean => {
    try {
      // Basic HMAC validation (in real implementation would use crypto)
      const expectedSignature = `sha256=${btoa(payload + secret)}`
      return signature === expectedSignature
    } catch (error) {
      console.error('Signature validation error:', error)
      return false
    }
  }

  // ===== UTILITY FUNCTIONS =====

  const updateStats = (eventList: WebhookEvent[]) => {
    const newStats: WebhookStats = {
      totalEvents: eventList.length,
      successfulEvents: eventList.filter(e => !e.type.includes('failed')).length,
      failedEvents: eventList.filter(e => e.type.includes('failed')).length,
      lastEventTime: eventList.length > 0 ? eventList[0].created : undefined,
      eventsByType: {} as Record<WebhookEventType, number>
    }

    // Count events by type
    eventList.forEach(event => {
      newStats.eventsByType[event.type] = (newStats.eventsByType[event.type] || 0) + 1
    })

    stats.value = newStats
  }

  const clearEvents = () => {
    events.value = []
    stats.value = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      eventsByType: {} as Record<WebhookEventType, number>
    }
  }

  const exportEvents = (format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify(events.value, null, 2)
    }
    
    // CSV format
    const headers = ['ID', 'Type', 'Created', 'Live Mode', 'Pending Webhooks']
    const rows = events.value.map(event => [
      event.id,
      event.type,
      new Date(event.created * 1000).toISOString(),
      event.livemode,
      event.pending_webhooks
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const filterEvents = (filter: { 
    type?: WebhookEventType
    dateFrom?: Date
    dateTo?: Date 
  }): WebhookEvent[] => {
    return events.value.filter(event => {
      if (filter.type && event.type !== filter.type) return false
      if (filter.dateFrom && event.created < filter.dateFrom.getTime() / 1000) return false
      if (filter.dateTo && event.created > filter.dateTo.getTime() / 1000) return false
      return true
    })
  }

  // Generate test data for different event types
  const generateTestData = (eventType: WebhookEventType): any => {
    const baseData = {
      id: `test_${Date.now()}`,
      object: eventType.split('.')[0],
      created: Math.floor(Date.now() / 1000),
      livemode: false
    }

    switch (eventType) {
      case 'customer.subscription.created':
        return {
          ...baseData,
          object: 'subscription',
          status: 'active',
          customer: 'cus_test123'
        }
      case 'invoice.payment_succeeded':
        return {
          ...baseData,
          object: 'invoice',
          status: 'paid',
          amount_paid: 1000,
          currency: 'usd'
        }
      default:
        return baseData
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    loading,
    error,
    events,
    stats,
    isMonitoring,

    // Webhook endpoint management
    createWebhookEndpoint,
    updateWebhookEndpoint,
    deleteWebhookEndpoint,
    listWebhookEndpoints,

    // Event monitoring
    startMonitoring,
    stopMonitoring,
    fetchEvents,
    fetchEvent,
    resendEvent,

    // Event handlers
    registerEventHandler,
    unregisterEventHandler,
    clearEventHandlers,

    // Testing & debugging
    simulateEvent,
    testWebhookEndpoint,
    validateWebhookSignature,

    // Utility functions
    clearEvents,
    exportEvents,
    filterEvents
  }
}