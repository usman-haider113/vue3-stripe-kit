import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStripeCheckout } from '../../src/composables/useStripeCheckout'
import type { CheckoutSessionConfig } from '../../src/types'

describe('useStripeCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create checkout session successfully', async () => {
    const mockResponse = { id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const { createCheckoutSession } = useStripeCheckout({
      apiEndpoint: '/api/stripe/create-checkout-session'
    })
    
    const config: CheckoutSessionConfig = {
      mode: 'payment',
      lineItems: [{
        priceData: {
          currency: 'usd',
          productData: { name: 'Test Product' },
          unitAmount: 2000
        },
        quantity: 1
      }],
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    }

    const result = await createCheckoutSession(config)
    
    expect(result).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/stripe/create-checkout-session'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(config)
      })
    )
  })

  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ message: 'Invalid request' })
    })

    const { createCheckoutSession, error } = useStripeCheckout({
      apiEndpoint: '/api/stripe/create-checkout-session'
    })
    
    const config: CheckoutSessionConfig = {
      mode: 'payment',
      lineItems: [],
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    }

    await expect(createCheckoutSession(config)).rejects.toThrow('Invalid request')
    expect(error.value).toBeTruthy()
    expect(error.value?.type).toBe('api_error')
  })
})