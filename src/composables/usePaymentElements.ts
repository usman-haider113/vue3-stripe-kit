import { ref, readonly, onUnmounted } from 'vue'
import type { 
  UsePaymentElementsReturn, 
  ElementsOptions, 
  PaymentElementOptions, 
  ExpressCheckoutElementOptions,
  StripeError 
} from '@/types'
import type { StripeElements } from '@stripe/stripe-js'
import { getStripeInstance } from '@/utils/stripe'

export function usePaymentElements(
  globalElementsOptions?: ElementsOptions
): UsePaymentElementsReturn {
  const elements = ref<StripeElements | null>(null)
  const paymentElement = ref<any | null>(null)
  const expressCheckoutElement = ref<any | null>(null)
  const loading = ref(false)
  const error = ref<StripeError | null>(null)

  const setupElements = async (options?: ElementsOptions): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe) {
        throw new Error('Stripe not initialized. Please call useStripe() first.')
      }

      // Merge global and local options
      const mergedOptions = {
        ...globalElementsOptions,
        ...options
      }

      // Validate required options for payment
      if (mergedOptions.mode === 'payment' && !mergedOptions.clientSecret) {
        throw new Error('clientSecret is required when mode is "payment"')
      }

      // Create elements with proper options
      const elementsOptions: any = { ...mergedOptions }
      elements.value = stripe.elements(elementsOptions)

      console.log('✅ Stripe Elements initialized with options:', mergedOptions)

    } catch (err) {
      const stripeError: StripeError = {
        type: 'elements_error',
        message: err instanceof Error ? err.message : 'Failed to setup elements'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const mountPaymentElement = async (
    elementId: string, 
    options?: PaymentElementOptions
  ): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      if (!elements.value) {
        throw new Error('Elements not initialized. Call setupElements() first.')
      }

      const elementContainer = document.getElementById(elementId)
      if (!elementContainer) {
        throw new Error(`Element with id "${elementId}" not found in DOM`)
      }

      // Create payment element with full customization
      const paymentElementInstance = (elements.value as any).create('payment', options)
      
      // Mount to DOM
      await paymentElementInstance.mount(`#${elementId}`)
      
      // Setup event listeners
      paymentElementInstance.on('change', (event: any) => {
        if (event.error) {
          error.value = {
            type: 'validation_error',
            message: event.error.message,
            code: event.error.code,
            param: event.error.param
          }
        } else {
          error.value = null
        }
      })

      paymentElement.value = paymentElementInstance

      console.log('✅ Payment Element mounted to', elementId, 'with options:', options)

    } catch (err) {
      const stripeError: StripeError = {
        type: 'mount_error',
        message: err instanceof Error ? err.message : 'Failed to mount payment element'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const mountExpressCheckout = async (
    elementId: string, 
    options?: ExpressCheckoutElementOptions
  ): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      if (!elements.value) {
        throw new Error('Elements not initialized. Call setupElements() first.')
      }

      const elementContainer = document.getElementById(elementId)
      if (!elementContainer) {
        throw new Error(`Element with id "${elementId}" not found in DOM`)
      }

      // Create express checkout element (Apple Pay, Google Pay, etc.)
      const expressElementInstance = (elements.value as any).create('expressCheckout', options)
      
      // Check if express checkout methods are available
      expressElementInstance.on('ready', (event: any) => {
        console.log('🚀 Express checkout methods available:', event.availablePaymentMethods)
        
        // Hide the element if no methods are available
        if (!event.availablePaymentMethods || event.availablePaymentMethods.length === 0) {
          elementContainer.style.display = 'none'
          console.log('⚠️ No express checkout methods available')
        }
      })

      // Handle express checkout click
      expressElementInstance.on('click', async (event: any) => {
        console.log('📱 Express checkout clicked:', event.expressPaymentType)
        // The actual payment handling is done in confirmPayment
      })

      // Mount to DOM
      await expressElementInstance.mount(`#${elementId}`)
      
      expressCheckoutElement.value = expressElementInstance

      console.log('✅ Express Checkout Element mounted to', elementId, 'with options:', options)

    } catch (err) {
      const stripeError: StripeError = {
        type: 'mount_error',
        message: err instanceof Error ? err.message : 'Failed to mount express checkout element'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const submitPayment = async (options?: { confirmParams?: any }): Promise<any> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe) {
        throw new Error('Stripe not initialized')
      }

      if (!elements.value) {
        throw new Error('Elements not initialized')
      }

      // Submit the form to Stripe for processing
      const { error: submitError } = await (elements.value as any).submit()
      if (submitError) {
        throw new Error(submitError.message)
      }

      // When elements are created with clientSecret, no need to pass it again
      // Confirm the payment using elements that already contain the clientSecret
      const result = await stripe.confirmPayment({
        elements: elements.value as any,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          ...options?.confirmParams
        },
        redirect: 'if_required'
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      console.log('✅ Payment submitted successfully:', result.paymentIntent)
      return result

    } catch (err) {
      const stripeError: StripeError = {
        type: 'payment_error',
        message: err instanceof Error ? err.message : 'Payment submission failed'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const confirmPayment = async (clientSecret: string, options?: any): Promise<any> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe || !elements.value) {
        throw new Error('Stripe or Elements not initialized')
      }

      const result = await stripe.confirmPayment({
        elements: elements.value as any,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          ...options
        },
        redirect: 'if_required'
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      console.log('✅ Payment confirmed successfully:', result.paymentIntent)
      return result

    } catch (err) {
      const stripeError: StripeError = {
        type: 'confirmation_error',
        message: err instanceof Error ? err.message : 'Payment confirmation failed'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  const confirmSetup = async (clientSecret: string, options?: any): Promise<any> => {
    try {
      loading.value = true
      error.value = null

      const stripe = getStripeInstance()
      if (!stripe || !elements.value) {
        throw new Error('Stripe or Elements not initialized')
      }

      const result = await stripe.confirmSetup({
        elements: elements.value as any,
        confirmParams: {
          return_url: `${window.location.origin}/setup-success`,
          ...options
        },
        redirect: 'if_required'
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      console.log('✅ Setup confirmed successfully:', result.setupIntent)
      return result

    } catch (err) {
      const stripeError: StripeError = {
        type: 'setup_confirmation_error',
        message: err instanceof Error ? err.message : 'Setup confirmation failed'
      }
      error.value = stripeError
      throw stripeError
    } finally {
      loading.value = false
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (paymentElement.value) {
      paymentElement.value.unmount()
    }
    if (expressCheckoutElement.value) {
      expressCheckoutElement.value.unmount()
    }
  })

  return {
    elements: readonly(elements),
    paymentElement: readonly(paymentElement),
    expressCheckoutElement: readonly(expressCheckoutElement),
    loading: readonly(loading),
    error: readonly(error),
    setupElements,
    mountPaymentElement,
    mountExpressCheckout,
    submitPayment,
    confirmPayment,
    confirmSetup
  }
}