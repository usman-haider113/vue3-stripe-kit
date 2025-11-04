<template>
  <div class="stripe-express-checkout">
    <!-- Express Checkout Container -->
    <div 
      :id="elementId"
      class="express-checkout-container"
      :class="{ 
        'loading': loading,
        'hidden': !showElement 
      }"
    ></div>
    
    <!-- Fallback message when no express methods available -->
    <div v-if="!loading && !showElement && showFallback" class="no-express-methods">
      <slot name="fallback">
        <p>Express checkout methods (Apple Pay, Google Pay) are not available on this device/browser.</p>
      </slot>
    </div>
    
    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { usePaymentElements } from '@/composables/usePaymentElements'
import type { 
  ElementsOptions, 
  ExpressCheckoutElementOptions 
} from '@/types'

interface Props {
  clientSecret: string
  elementId?: string
  elementsOptions?: ElementsOptions
  expressCheckoutOptions?: ExpressCheckoutElementOptions
  autoSetup?: boolean
  showFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  elementId: 'stripe-express-checkout',
  autoSetup: true,
  showFallback: true
})

const emit = defineEmits<{
  ready: [elementId: string, availableMethods: string[]]
  click: [event: any]
  cancel: [event: any]
  error: [error: any]
  mounted: [element: any]
}>()

// Generate unique element ID
const elementId = ref(props.elementId + '-' + Math.random().toString(36).substr(2, 9))
const showElement = ref(true)
const availableMethods = ref<string[]>([])

// Use payment elements composable with unique instance for this component
const {
  elements,
  expressCheckoutElement,
  loading,
  error,
  setupElements,
  mountExpressCheckout
} = usePaymentElements()

// Setup and mount element
const initializeElement = async () => {
  try {
    // Setup elements with user-provided options + clientSecret
    await setupElements({
      clientSecret: props.clientSecret,
      ...props.elementsOptions
    })
    
    // Mount express checkout element
    await mountExpressCheckout(elementId.value, props.expressCheckoutOptions)
    
    // Setup event listeners
    if (expressCheckoutElement.value) {
      // Handle when express checkout is ready
      expressCheckoutElement.value.on('ready', (event: any) => {
        console.log('🚀 Express checkout ready:', event.availablePaymentMethods)
        
        availableMethods.value = event.availablePaymentMethods || []
        
        // Hide element if no methods available
        if (!event.availablePaymentMethods || event.availablePaymentMethods.length === 0) {
          showElement.value = false
          console.log('⚠️ No express checkout methods available')
        } else {
          showElement.value = true
        }
        
        emit('ready', elementId.value, availableMethods.value)
      })
      
      // Handle clicks
      expressCheckoutElement.value.on('click', (event: any) => {
        console.log('📱 Express checkout clicked:', event.expressPaymentType)
        emit('click', event)
      })
      
      // Handle cancellation
      expressCheckoutElement.value.on('cancel', (event: any) => {
        console.log('❌ Express checkout cancelled')
        emit('cancel', event)
      })
    }
    
    emit('mounted', expressCheckoutElement.value)
    
  } catch (err) {
    console.error('❌ Express checkout initialization failed:', err)
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

// Auto-initialize on mount
onMounted(() => {
  if (props.autoSetup && props.clientSecret) {
    initializeElement()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (expressCheckoutElement.value) {
    expressCheckoutElement.value.unmount()
  }
})

// Expose methods and properties
defineExpose({
  setupElements,
  mountExpressCheckout,
  expressCheckoutElement,
  elements,
  loading,
  error,
  showElement,
  availableMethods
})
</script>

<style scoped>
.stripe-express-checkout {
  position: relative;
}

.express-checkout-container {
  min-height: 40px;
  transition: opacity 0.2s ease;
}

.express-checkout-container.loading {
  opacity: 0.6;
  pointer-events: none;
}

.express-checkout-container.hidden {
  display: none;
}

.no-express-methods {
  text-align: center;
  padding: 16px;
  color: #6b7280;
  font-size: 14px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
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

/* Express checkout button styling */
:deep(.StripeExpressCheckoutElement) {
  border-radius: 6px;
  overflow: hidden;
}

/* Individual express method buttons */
:deep(.StripeExpressCheckoutElement button) {
  height: 40px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.StripeExpressCheckoutElement button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Responsive design */
@media (max-width: 640px) {
  :deep(.StripeExpressCheckoutElement) {
    width: 100%;
  }
  
  :deep(.StripeExpressCheckoutElement button) {
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>