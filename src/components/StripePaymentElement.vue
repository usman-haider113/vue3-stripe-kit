<template>
  <div class="stripe-payment-element">
    <!-- Payment Element Container -->
    <div 
      :id="elementId" 
      class="payment-element-container"
      :class="{ 'loading': loading }"
    ></div>
    
    <!-- Submit Button (optional) -->
    <button
      v-if="showSubmitButton && paymentElement"
      @click="handleSubmit"
      :disabled="loading"
      class="submit-button"
      :class="{ 'loading': loading }"
    >
      <slot name="submit-button">
        <span v-if="!loading">{{ submitButtonText }}</span>
        <span v-else>Processing...</span>
      </slot>
    </button>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error.message }}
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="loading-indicator">
      <slot name="loading">
        <div class="spinner"></div>
        <span>Loading payment form...</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { usePaymentElements } from '@/composables/usePaymentElements'
import type { 
  ElementsOptions, 
  PaymentElementOptions 
} from '@/types'

interface Props {
  clientSecret: string
  elementId?: string
  elementsOptions?: ElementsOptions
  paymentElementOptions?: PaymentElementOptions
  autoSetup?: boolean
  showSubmitButton?: boolean
  submitButtonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  elementId: 'stripe-payment-element',
  autoSetup: true,
  showSubmitButton: false,
  submitButtonText: 'Pay Now'
})

const emit = defineEmits<{
  ready: [elementId: string]
  change: [event: any]
  error: [error: any]
  mounted: [element: any]
  'payment-success': [result: any]
  'payment-error': [error: any]
}>()

// Generate unique element ID if needed
const elementId = ref(props.elementId + '-' + Math.random().toString(36).substr(2, 9))

// Use payment elements composable with unique instance for this component
const {
  elements,
  paymentElement,
  loading,
  error,
  setupElements,
  mountPaymentElement,
  submitPayment
} = usePaymentElements()

// Setup and mount element
const initializeElement = async () => {
  try {
    // Setup elements with user-provided options + clientSecret
    await setupElements({
      clientSecret: props.clientSecret,
      ...props.elementsOptions
    })
    
    // Mount payment element
    await mountPaymentElement(elementId.value, props.paymentElementOptions)
    
    emit('ready', elementId.value)
    emit('mounted', paymentElement.value)
    
  } catch (err) {
    emit('error', err)
  }
}

// Watch for client secret changes
watch(
  () => props.clientSecret,
  (newSecret) => {
    if (newSecret && props.autoSetup) {
      initializeElement()
    }
  },
  { immediate: props.autoSetup }
)

// Watch for errors
watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})

// Auto-initialize on mount if enabled
onMounted(() => {
  if (props.autoSetup && props.clientSecret) {
    initializeElement()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (paymentElement.value) {
    paymentElement.value.unmount()
  }
})

// Submit payment method
const handleSubmit = async () => {
  try {
    const result = await submitPayment()
    emit('payment-success', result)
    return result
  } catch (err) {
    emit('payment-error', err)
    throw err
  }
}

// Expose methods for parent components
defineExpose({
  setupElements,
  mountPaymentElement,
  submitPayment: handleSubmit,
  paymentElement,
  elements,
  loading,
  error
})
</script>

<style scoped>
.stripe-payment-element {
  position: relative;
}

.payment-element-container {
  min-height: 40px;
  border-radius: 4px;
  transition: opacity 0.2s ease;
}

.payment-element-container.loading {
  opacity: 0.6;
  pointer-events: none;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #6b7280;
  font-size: 14px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Allow parent to customize appearance */
:deep(.StripeElement) {
  border-radius: 4px;
  padding: 10px 12px;
}

:deep(.StripeElement--focus) {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  border-color: #6366f1;
}

:deep(.StripeElement--invalid) {
  border-color: #ef4444;
}

/* Submit Button */
.submit-button {
  width: 100%;
  margin-top: 16px;
  padding: 12px 24px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.submit-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.submit-button.loading {
  position: relative;
}
</style>