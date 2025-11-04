import type { CheckoutSessionConfig, CheckoutOptions } from '@/types'
import { getStripeInstance } from './stripe'
import { buildApiUrl, buildRequestHeaders, getRequestTimeout } from './config'

export interface QuickCheckoutOptions {
  publishableKey?: string
  sessionId?: string
  config?: CheckoutSessionConfig
  apiEndpoint?: string
  timeout?: number
  headers?: Record<string, string>
  retries?: number
}

export async function quickCheckout(options: QuickCheckoutOptions): Promise<void> {
  const {
    sessionId,
    config,
    apiEndpoint,
    timeout,
    headers: customHeaders,
    retries
  } = options

  if (!sessionId && !config) {
    throw new Error('Either sessionId or config must be provided')
  }

  if (!apiEndpoint && !config) {
    throw new Error('apiEndpoint is required when creating a session')
  }

  try {
    let checkoutSessionId = sessionId

    if (!checkoutSessionId && config) {
      const checkoutOptions: CheckoutOptions = {
        apiEndpoint,
        timeout,
        headers: customHeaders,
        retries
      }

      const url = buildApiUrl(undefined, checkoutOptions, undefined)
      const headers = buildRequestHeaders(checkoutOptions, undefined)
      const requestTimeout = getRequestTimeout(checkoutOptions, undefined)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout)
      
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

      const session = await response.json()
      checkoutSessionId = session.id
    }

    if (!checkoutSessionId) {
      throw new Error('No session ID provided or created')
    }

    const stripe = getStripeInstance()
    if (!stripe) {
      throw new Error('Stripe not initialized. Please call useStripe() first or provide publishableKey.')
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: checkoutSessionId
    })

    if (error) {
      throw new Error(error.message)
    }

  } catch (error) {
    console.error('Checkout failed:', error)
    throw error
  }
}

export function buildLineItems(items: Array<{
  name: string
  description?: string
  amount: number
  currency: string
  quantity?: number
  images?: string[]
}>): CheckoutSessionConfig['lineItems'] {
  return items.map(item => ({
    priceData: {
      currency: item.currency,
      productData: {
        name: item.name,
        description: item.description,
        images: item.images
      },
      unitAmount: item.amount
    },
    quantity: item.quantity || 1
  }))
}