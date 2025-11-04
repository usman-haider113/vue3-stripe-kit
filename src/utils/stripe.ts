import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import type { StripeConfig } from '@/types'

let stripeInstance: Stripe | null = null

export async function initializeStripe(config: StripeConfig): Promise<Stripe | null> {
  try {
    if (stripeInstance) {
      return stripeInstance
    }

    stripeInstance = await loadStripe(config.publishableKey, {
      apiVersion: config.apiVersion,
      locale: config.locale as any,
      stripeAccount: config.stripeAccount,
    })

    return stripeInstance
  } catch (error) {
    console.error('Failed to initialize Stripe:', error)
    return null
  }
}

export function getStripeInstance(): Stripe | null {
  return stripeInstance
}

export function resetStripeInstance(): void {
  stripeInstance = null
}