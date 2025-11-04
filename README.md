# Vue3 Stripe Kit

[![npm version](https://badge.fury.io/js/vue3-stripe-kit.svg)](https://badge.fury.io/js/vue3-stripe-kit)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)

The most comprehensive and flexible Stripe integration kit for Vue 3. Built with TypeScript and the Composition API, offering both composable hooks and ready-to-use components with full modular support.

---

## 🚀 Key Features

- **🎯 Dual Approach** - Use composables for full control or components for quick integration
- **⚡ Auto-Initialization** - Stripe automatically initializes when plugin is installed
- **📦 Modular Architecture** - Import only what you need to minimize bundle size
- **🔧 Unique Instances** - Each composable call creates an independent instance
- **🎨 Vue 3 Native** - Built with Composition API and full reactivity
- **📝 TypeScript First** - Complete type safety with comprehensive type definitions
- **🛡️ Production Ready** - Advanced error handling and loading states

---

## 📦 Installation

```bash
npm install vue3-stripe-kit
# or
yarn add vue3-stripe-kit
# or
pnpm add vue3-stripe-kit
```

---

## ⚡ Quick Start

### 1. Global Plugin Setup

```typescript
// main.ts
import { createApp } from 'vue'
import Vue3StripeKit from 'vue3-stripe-kit'
import App from './App.vue'

const app = createApp(App)

app.use(Vue3StripeKit, {
  publishableKey: 'pk_test_your_key_here',
  apiBaseUrl: 'https://your-api.com', // Your backend base URL
})

// Stripe is automatically initialized! No manual setup needed.

app.mount('#app')
```

---

## 🎯 Two Approaches to Choose From

Vue3 Stripe Kit offers two integration approaches - choose based on your needs:

| Feature | **Composables** | **Components** |
|---------|----------------|----------------|
| **Setup Complexity** | Manual DOM mounting | Automatic |
| **Control Level** | Full control over timing & flow | Simplified, opinionated |
| **Submission** | Manual `submitPayment()` call | Built-in submit button (optional) |
| **Bundle Size** | Minimal (import only composables) | Slightly larger (includes components) |
| **Best For** | Custom UX, complex flows | Standard forms, rapid development |
| **TypeScript Support** | ✅ Full | ✅ Full |

---

## 📚 Approach 1: Composables (Full Control)

Perfect when you need complete control over the payment flow and DOM mounting.

### Payment Elements Example

```vue
<template>
  <div>
    <!-- Setup Phase -->
    <div v-if="!clientSecret">
      <button @click="createPayment" :disabled="creating">
        {{ creating ? 'Creating...' : 'Setup Payment' }}
      </button>
    </div>

    <!-- Payment Phase -->
    <div v-else>
      <!-- Express Checkout -->
      <div id="express-checkout-element"></div>

      <!-- Payment Form -->
      <div id="payment-element"></div>

      <button @click="submitPayment" :disabled="loading">
        {{ loading ? 'Processing...' : 'Pay Now' }}
      </button>

      <div v-if="error" class="error">{{ error.message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { usePaymentElements, usePaymentIntents } from 'vue3-stripe-kit/elements'

// Each call creates a unique, independent instance
const {
  setupElements,
  mountPaymentElement,
  mountExpressCheckout,
  submitPayment,
  loading,
  error
} = usePaymentElements()

const { createPaymentIntent, loading: creating } = usePaymentIntents()
const clientSecret = ref('')

const createPayment = async () => {
  const paymentIntent = await createPaymentIntent({
    amount: 2499, // $24.99
    currency: 'usd',
    description: 'Product description'
  })

  clientSecret.value = paymentIntent.clientSecret

  // Setup elements with configuration
  await setupElements({
    clientSecret: paymentIntent.clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#0570de' }
    }
  })
}

// Mount elements when DOM is ready
watch(clientSecret, async (newSecret) => {
  if (newSecret) {
    await nextTick() // Wait for DOM update
    await mountPaymentElement('payment-element')
    await mountExpressCheckout('express-checkout-element')
  }
})
</script>
```

### Checkout Session Example

```vue
<script setup lang="ts">
import { useStripeCheckout } from 'vue3-stripe-kit/checkout'

const { createCheckoutSession, redirectToCheckout, loading, error } = useStripeCheckout()

const handleCheckout = async () => {
  const session = await createCheckoutSession({
    mode: 'payment',
    lineItems: [{
      priceData: {
        currency: 'usd',
        productData: { name: 'Premium Product' },
        unitAmount: 2999
      },
      quantity: 1
    }],
    successUrl: 'https://yoursite.com/success',
    cancelUrl: 'https://yoursite.com/cancel'
  })

  await redirectToCheckout(session.id)
}
</script>
```

### Subscription Management Example

```vue
<script setup lang="ts">
import { useSubscriptions } from 'vue3-stripe-kit/subscriptions'

const {
  createSubscription,
  cancelSubscription,
  changePlan,
  pauseSubscription,
  loading,
  error
} = useSubscriptions()

// Create subscription with trial
const subscribe = async () => {
  const subscription = await createSubscription({
    customer: 'cus_123',
    items: [{ price: 'price_123', quantity: 1 }],
    trial_period_days: 14
  })
}

// Cancel subscription
const cancel = async (subscriptionId: string) => {
  await cancelSubscription(subscriptionId, {
    cancelAtPeriodEnd: true
  })
}
</script>
```

---

## 🎨 Approach 2: Vue Components (Easy Integration)

Perfect for rapid development with minimal setup. Components handle everything automatically.

### Payment Element Component

```vue
<template>
  <div>
    <!-- Setup Phase -->
    <div v-if="!clientSecret">
      <button @click="createPayment" :disabled="creating">
        {{ creating ? 'Creating...' : 'Setup Payment' }}
      </button>
    </div>

    <!-- Payment Component with Built-in Submit Button -->
    <StripePaymentElement
      v-else
      :client-secret="clientSecret"
      :elements-options="{ appearance: { theme: 'stripe' } }"
      :payment-element-options="{ layout: 'tabs' }"
      :show-submit-button="true"
      submit-button-text="Pay $24.99"
      @payment-success="handleSuccess"
      @payment-error="handleError"
      @ready="handleReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePaymentIntents } from 'vue3-stripe-kit/elements'
import { StripePaymentElement } from 'vue3-stripe-kit/components'

const { createPaymentIntent, loading: creating } = usePaymentIntents()
const clientSecret = ref('')

const createPayment = async () => {
  const paymentIntent = await createPaymentIntent({
    amount: 2499,
    currency: 'usd'
  })
  clientSecret.value = paymentIntent.clientSecret
  // Component auto-initializes when clientSecret is provided!
}

const handleSuccess = (result: any) => {
  console.log('Payment successful:', result.paymentIntent.id)
}

const handleError = (error: any) => {
  console.error('Payment failed:', error)
}

const handleReady = (elementId: string) => {
  console.log('Payment element ready:', elementId)
}
</script>
```

### Express Checkout Component

```vue
<template>
  <StripeExpressCheckout
    :client-secret="clientSecret"
    :elements-options="{ appearance: { theme: 'stripe' } }"
    :express-checkout-options="{
      paymentMethods: {
        applePay: 'auto',
        googlePay: 'auto'
      }
    }"
    @click="handleExpressClick"
    @ready="handleExpressReady"
  />
</template>

<script setup lang="ts">
import { StripeExpressCheckout } from 'vue3-stripe-kit/components'

const handleExpressClick = () => {
  console.log('Express payment initiated')
}

const handleExpressReady = (elementId: string, methods: string[]) => {
  console.log('Available payment methods:', methods)
}
</script>
```

### Subscription Manager Component

```vue
<template>
  <StripeSubscriptionManager
    :subscription-id="currentSubscriptionId"
    :customer-id="customerId"
    :available-plans="plans"
    :show-pause-option="true"
    :allow-trial-extension="true"
    @subscription-updated="handleSubscriptionUpdate"
    @plan-changed="handlePlanChange"
  />
</template>

<script setup lang="ts">
import { StripeSubscriptionManager } from 'vue3-stripe-kit/components'

const plans = [
  {
    id: 'price_basic',
    nickname: 'Basic Plan',
    unit_amount: 999,
    currency: 'usd',
    recurring: { interval: 'month' }
  }
]

const handleSubscriptionUpdate = (subscription: any) => {
  console.log('Subscription updated:', subscription)
}

const handlePlanChange = (subscription: any, oldPlan: string, newPlan: string) => {
  console.log('Plan changed from', oldPlan, 'to', newPlan)
}
</script>
```

---

## 📦 Modular Imports (Tree-Shakeable)

Import only what you need to minimize bundle size:

```typescript
// Checkout only (~3KB)
import { useStripeCheckout } from 'vue3-stripe-kit/checkout'

// Payment Elements (~5KB)
import { usePaymentElements, usePaymentIntents } from 'vue3-stripe-kit/elements'

// Subscriptions Full (~8KB)
import { useSubscriptions } from 'vue3-stripe-kit/subscriptions'

// Subscriptions Lite (~4KB) - Basic create, cancel, retrieve only
import { useSubscriptionsLite } from 'vue3-stripe-kit/subscriptions-lite'

// Webhooks (~4KB)
import { useWebhooks } from 'vue3-stripe-kit/webhooks'

// Vue Components
import {
  StripePaymentElement,
  StripeExpressCheckout,
  StripeSubscriptionManager
} from 'vue3-stripe-kit/components'

// Types
import type { PaymentIntentData, SubscriptionStatus } from 'vue3-stripe-kit/types'
```

### Module Comparison

| Module | Size | Features |
|--------|------|----------|
| `checkout` | ~3KB | Checkout sessions, redirects |
| `elements` | ~5KB | Payment forms, express checkout |
| `subscriptions-lite` | ~4KB | Create, cancel, retrieve subscriptions |
| `subscriptions` | ~8KB | Full lifecycle: pause, resume, plan changes, trials |
| `webhooks` | ~4KB | Webhook monitoring and handling |
| `components` | ~6KB | Pre-built Vue components |
| **Full Package** | ~16KB | All features combined |

---

## 🔧 API Reference

### Component Props

#### StripePaymentElement

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clientSecret` | `string` | **required** | Payment intent client secret |
| `elementsOptions` | `object` | `{}` | Stripe Elements configuration |
| `paymentElementOptions` | `object` | `{}` | Payment element specific options |
| `showSubmitButton` | `boolean` | `false` | Show built-in submit button |
| `submitButtonText` | `string` | `'Pay Now'` | Submit button text |
| `elementId` | `string` | auto-generated | Custom element ID |
| `autoSetup` | `boolean` | `true` | Auto-initialize on mount |

**Events:**
- `@payment-success` - Payment completed successfully
- `@payment-error` - Payment failed
- `@ready` - Element is ready
- `@mounted` - Element mounted to DOM
- `@change` - Form validation changes
- `@error` - Error occurred

#### StripeExpressCheckout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clientSecret` | `string` | **required** | Payment intent client secret |
| `elementsOptions` | `object` | `{}` | Stripe Elements configuration |
| `expressCheckoutOptions` | `object` | `{}` | Express checkout options |
| `showFallback` | `boolean` | `true` | Show message when no methods available |
| `elementId` | `string` | auto-generated | Custom element ID |
| `autoSetup` | `boolean` | `true` | Auto-initialize on mount |

**Events:**
- `@click` - Express payment clicked
- `@ready` - Element ready with available methods
- `@cancel` - Payment cancelled
- `@error` - Error occurred
- `@mounted` - Element mounted to DOM

### Composables API

#### usePaymentElements()

Returns a unique instance with:

```typescript
{
  // Setup & Mounting
  setupElements: (options: ElementsOptions & { clientSecret: string }) => Promise<void>
  mountPaymentElement: (elementId: string, options?: PaymentElementOptions) => Promise<void>
  mountExpressCheckout: (elementId: string, options?: ExpressCheckoutElementOptions) => Promise<void>

  // Payment Processing
  submitPayment: (options?: ConfirmPaymentOptions) => Promise<PaymentResult>

  // Reactive State
  elements: Ref<StripeElements | null>
  paymentElement: Ref<StripePaymentElement | null>
  expressCheckoutElement: Ref<StripeExpressCheckoutElement | null>
  loading: Ref<boolean>
  error: Ref<StripeError | null>
}
```

#### usePaymentIntents()

```typescript
{
  createPaymentIntent: (data: PaymentIntentData) => Promise<PaymentIntent>
  loading: Ref<boolean>
  error: Ref<StripeError | null>
}
```

#### useSubscriptions() vs useSubscriptionsLite()

**Full Version** (`subscriptions`):
- ✅ Create, update, cancel subscriptions
- ✅ Pause and resume
- ✅ Plan changes with proration
- ✅ Trial management (start, extend, end)
- ✅ Add/remove subscription items
- ✅ Invoice preview
- ✅ Helper functions (isActive, isTrialing, daysUntilRenewal)

**Lite Version** (`subscriptions-lite`):
- ✅ Create subscription
- ✅ Cancel subscription
- ✅ Retrieve subscription
- ❌ Advanced features removed
- **Use when:** You only need basic subscription operations and want smaller bundle

---

## 🏗️ Backend Setup

Your vue3-stripe-kit frontend needs a backend to create payment intents. Here's a minimal Express.js example:

```javascript
const express = require('express')
const stripe = require('stripe')('sk_test_your_secret_key')
const cors = require('cors')

const app = express()
app.use(express.json())
app.use(cors())

// Create Payment Intent
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, description } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      automatic_payment_methods: { enabled: true }
    })

    res.json({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Create Checkout Session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: req.body.lineItems,
      success_url: req.body.successUrl,
      cancel_url: req.body.cancelUrl
    })

    res.json({ id: session.id, url: session.url })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.listen(3001, () => console.log('Server running on port 3001'))
```

---

## 🎨 Customization

### Appearance Customization

```typescript
const elementsOptions = {
  appearance: {
    theme: 'stripe', // 'stripe' | 'night' | 'flat'
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px'
    },
    rules: {
      '.Input': {
        backgroundColor: '#f6f8fa',
        border: '1px solid #d0d7de'
      }
    }
  }
}
```

### Payment Element Options

```typescript
const paymentElementOptions = {
  layout: 'tabs', // 'tabs' | 'accordion' | 'auto'
  fields: {
    billingDetails: 'auto' // 'auto' | 'never'
  },
  wallets: {
    applePay: 'auto',
    googlePay: 'auto'
  },
  defaultValues: {
    billingDetails: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
}
```

---

## 🧪 Testing

### Test Cards

Use these test card numbers in development:

| Card Number | Description |
|-------------|-------------|
| `4242424242424242` | Visa - Succeeds |
| `4000000000000002` | Visa - Declined |
| `4000002500003155` | Visa - Requires 3D Secure |
| `4000000000009995` | Visa - Always Declines |

**CVV:** Any 3 digits
**Expiry:** Any future date
**ZIP:** Any 5 digits

---

## 🔒 Security Best Practices

1. ✅ **Never expose secret keys** - Only use publishable keys in frontend
2. ✅ **Validate on backend** - Always verify payments server-side
3. ✅ **Use HTTPS** - Required for production Stripe integration
4. ✅ **Implement webhooks** - For reliable payment confirmations
5. ✅ **Sanitize inputs** - Validate all payment data on your backend
6. ✅ **Handle errors gracefully** - Show user-friendly error messages
7. ✅ **Test thoroughly** - Use test mode before going live

---

## 🛠️ Development

### Build Package

```bash
npm run build
```

### Run Tests

```bash
npm run test
npm run test:coverage
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Contact

- **Email:** [usman.haider@crewlogix.com](mailto:usman.haider@crewlogix.com)
- **Issues:** [GitHub Issues](https://github.com/yourusername/vue3-stripe-kit/issues)

---

## 🙏 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⭐ Why Vue3 Stripe Kit?

| Feature | Vue3 Stripe Kit | Other Packages |
|---------|-----------------|----------------|
| **Vue 3 Native** | ✅ Composition API | ❌ Vue 2 / Wrapper |
| **TypeScript** | ✅ Complete coverage | ⚠️ Limited |
| **Modular** | ✅ Import what you need | ❌ Monolithic |
| **Dual Approach** | ✅ Composables + Components | ❌ Single approach |
| **Unique Instances** | ✅ Independent state | ❌ Global state |
| **Auto-initialization** | ✅ Plugin handles it | ❌ Manual setup |
| **Subscriptions** | ✅ Full lifecycle management | ⚠️ Basic only |
| **Components** | ✅ Pre-built + customizable | ❌ None |
| **Bundle Size** | ✅ 3-16KB (modular) | ⚠️ Larger |

---

**Built with ❤️ for the Vue.js community**

*The most comprehensive Stripe integration for Vue 3 developers* 🚀
