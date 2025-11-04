import type { Ref } from 'vue'
import type { Stripe, StripeElements } from '@stripe/stripe-js'

export interface StripeConfig {
  publishableKey: string
  apiVersion?: string
  locale?: string
  stripeAccount?: string
  // API Configuration
  apiBaseUrl?: string
  checkoutEndpoint?: string
  // Request Configuration  
  requestTimeout?: number
  headers?: Record<string, string>
}

export interface CheckoutSessionConfig {
  mode: 'payment' | 'subscription' | 'setup'
  lineItems: Array<{
    price?: string
    priceData?: {
      currency: string
      productData: {
        name: string
        description?: string
        images?: string[]
      }
      unitAmount?: number
      recurring?: {
        interval: 'day' | 'week' | 'month' | 'year'
        intervalCount?: number
      }
    }
    quantity?: number
  }>
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  clientReferenceId?: string
  metadata?: Record<string, string>
  allowPromotionCodes?: boolean
  billingAddressCollection?: 'auto' | 'required'
  shippingAddressCollection?: {
    allowedCountries: string[]
  }
}

export interface StripeCheckoutResponse {
  id: string
  url: string | null
}

export interface StripeError {
  type: string
  code?: string
  message: string
  param?: string
}

export interface CheckoutOptions {
  apiEndpoint?: string
  timeout?: number
  headers?: Record<string, string>
  retries?: number
}

export interface UseStripeCheckoutOptions {
  apiEndpoint?: string
  timeout?: number
  headers?: Record<string, string>
  retries?: number
}

export interface UseStripeCheckoutReturn {
  createCheckoutSession: (config: CheckoutSessionConfig, options?: CheckoutOptions) => Promise<StripeCheckoutResponse>
  redirectToCheckout: (sessionId: string) => Promise<void>
  loading: Ref<boolean>
  error: Ref<StripeError | null>
}

// Payment Elements Configuration
export interface PaymentElementOptions {
  layout?: 'tabs' | 'accordion' | 'auto'
  defaultValues?: {
    billingDetails?: {
      name?: string
      email?: string
      phone?: string
      address?: {
        line1?: string
        line2?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
      }
    }
  }
  business?: {
    name?: string
  }
  paymentMethodOrder?: string[]
  fields?: {
    billingDetails?: 'auto' | 'never' | {
      name?: 'auto' | 'never'
      email?: 'auto' | 'never'
      phone?: 'auto' | 'never'
      address?: 'auto' | 'never' | {
        line1?: 'auto' | 'never'
        line2?: 'auto' | 'never'
        city?: 'auto' | 'never'
        state?: 'auto' | 'never'
        postal_code?: 'auto' | 'never'
        country?: 'auto' | 'never'
      }
    }
  }
  terms?: {
    card?: 'auto' | 'always' | 'never'
    ideal?: 'auto' | 'always' | 'never'
    sepaDebit?: 'auto' | 'always' | 'never'
    sofort?: 'auto' | 'always' | 'never'
    bancontact?: 'auto' | 'always' | 'never'
  }
  wallets?: {
    applePay?: 'auto' | 'always' | 'never'
    googlePay?: 'auto' | 'always' | 'never'
  }
}

export interface ExpressCheckoutElementOptions {
  paymentMethods?: {
    applePay?: 'auto' | 'always' | 'never'
    googlePay?: 'auto' | 'always' | 'never'
    link?: 'auto' | 'always' | 'never'
    paypal?: 'auto' | 'always' | 'never'
  }
  layout?: {
    maxColumns?: number
    maxRows?: number
    overflow?: 'auto' | 'hidden'
  }
  buttonTheme?: {
    applePay?: 'black' | 'white' | 'white-outline'
    googlePay?: 'black' | 'white' | 'white-outline'
  }
  buttonType?: {
    applePay?: 'plain' | 'buy' | 'set-up' | 'donate' | 'check-out' | 'book' | 'subscribe'
    googlePay?: 'book' | 'buy' | 'checkout' | 'donate' | 'order' | 'pay' | 'plain' | 'subscribe'
  }
  buttonHeight?: string
}

export interface ElementsTheme {
  colorPrimary?: string
  colorBackground?: string
  colorText?: string
  colorDanger?: string
  fontFamily?: string
  fontSizeBase?: string
  borderRadius?: string
  fontSmoothing?: 'auto' | 'never' | 'always'
}

export interface ElementsAppearance {
  theme?: 'stripe' | 'night' | 'flat' | 'none'
  variables?: ElementsTheme
  rules?: Record<string, any>
}

export interface ElementsOptions {
  fonts?: Array<{
    family?: string
    src?: string
    style?: string
    weight?: string
  }>
  locale?: string
  appearance?: ElementsAppearance
  clientSecret?: string
  mode?: 'payment' | 'setup' | 'subscription'
  currency?: string
  amount?: number
  setupFutureUsage?: 'on_session' | 'off_session'
  paymentMethodCreation?: 'manual' | 'automatic'
  paymentMethodOptions?: Record<string, any>
  paymentMethodTypes?: string[]
  wallets?: {
    applePay?: 'auto' | 'always' | 'never'
    googlePay?: 'auto' | 'always' | 'never'
    link?: 'auto' | 'always' | 'never'
  }
}

// Payment Intent Configuration
export interface PaymentIntentConfig {
  amount: number
  currency: string
  paymentMethodTypes?: string[]
  captureMethod?: 'automatic' | 'manual'
  confirmationMethod?: 'automatic' | 'manual'
  description?: string
  receiptEmail?: string
  shipping?: {
    name: string
    address: {
      line1: string
      line2?: string
      city: string
      state?: string
      postal_code: string
      country: string
    }
  }
  metadata?: Record<string, string>
  statementDescriptor?: string
  statementDescriptorSuffix?: string
  setupFutureUsage?: 'on_session' | 'off_session'
  transferGroup?: string
  applicationFeeAmount?: number
  onBehalfOf?: string
}

export interface PaymentIntentResponse {
  id: string
  clientSecret: string
  status: string
  amount: number
  currency: string
}

// Updated Composable Returns
export interface UsePaymentElementsReturn {
  elements: Ref<StripeElements | null>
  paymentElement: Ref<any | null>
  expressCheckoutElement: Ref<any | null>
  loading: Ref<boolean>
  error: Ref<StripeError | null>
  setupElements: (options?: ElementsOptions) => Promise<void>
  mountPaymentElement: (elementId: string, options?: PaymentElementOptions) => Promise<void>
  mountExpressCheckout: (elementId: string, options?: ExpressCheckoutElementOptions) => Promise<void>
  submitPayment: (options?: { confirmParams?: any }) => Promise<any>
  confirmPayment: (clientSecret: string, options?: any) => Promise<any>
  confirmSetup: (clientSecret: string, options?: any) => Promise<any>
}

export interface UsePaymentIntentsReturn {
  createPaymentIntent: (config: PaymentIntentConfig, options?: CheckoutOptions) => Promise<PaymentIntentResponse>
  confirmPaymentIntent: (clientSecret: string, paymentMethod?: any) => Promise<any>
  retrievePaymentIntent: (clientSecret: string) => Promise<any>
  loading: Ref<boolean>
  error: Ref<StripeError | null>
}

export interface UseStripeReturn {
  stripe: Ref<Stripe | null>
  elements: Ref<StripeElements | null>
  loading: Ref<boolean>
  error: Ref<StripeError | null>
  createElements: (options?: ElementsOptions) => StripeElements | null
}

// ===== SUBSCRIPTION TYPES =====

export interface RequestConfig {
  apiEndpoint?: string
  timeout?: number
  headers?: Record<string, string>
  retries?: number
}

export interface SubscriptionItem {
  id?: string
  price: string | PriceData
  quantity?: number
  metadata?: Record<string, string>
}

export interface PriceData {
  currency: string
  product: string | ProductData
  unit_amount?: number
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year'
    interval_count?: number
    usage_type?: 'licensed' | 'metered'
  }
  billing_scheme?: 'per_unit' | 'tiered'
  tiers?: Array<{
    up_to: number | 'inf'
    flat_amount?: number
    unit_amount?: number
  }>
  transform_usage?: {
    divide_by: number
    round: 'up' | 'down'
  }
}

export interface ProductData {
  name: string
  description?: string
  images?: string[]
  metadata?: Record<string, string>
  statement_descriptor?: string
}

export interface TrialSettings {
  trial_period_days?: number
  trial_end?: number
  trial_from_plan?: boolean
}

export interface CreateSubscriptionData {
  customer?: string
  items: SubscriptionItem[]
  payment_behavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete'
  payment_settings?: {
    payment_method_types?: string[]
    save_default_payment_method?: 'on_subscription' | 'off'
  }
  expand?: string[]
  metadata?: Record<string, string>
  description?: string
  trial_period_days?: number
  trial_end?: number
  trial_settings?: TrialSettings
  billing_cycle_anchor?: number
  collection_method?: 'charge_automatically' | 'send_invoice'
  days_until_due?: number
  default_payment_method?: string
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice'
  billing_thresholds?: {
    amount_gte?: number
    reset_billing_cycle_anchor?: boolean
  }
  cancel_at?: number
  cancel_at_period_end?: boolean
  default_source?: string
  default_tax_rates?: string[]
  off_session?: boolean
  promotion_code?: string
  transfer_data?: {
    destination: string
    amount_percent?: number
  }
}

export interface UpdateSubscriptionData {
  cancel_at_period_end?: boolean
  default_payment_method?: string
  description?: string
  items?: Array<{
    id?: string
    price?: string
    quantity?: number
    deleted?: boolean
    metadata?: Record<string, string>
  }>
  metadata?: Record<string, string>
  payment_behavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete'
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice'
  proration_date?: number
  billing_cycle_anchor?: 'now' | 'unchanged'
  trial_end?: number | 'now'
  billing_thresholds?: {
    amount_gte?: number
    reset_billing_cycle_anchor?: boolean
  }
  cancel_at?: number
  default_source?: string
  default_tax_rates?: string[]
  off_session?: boolean
  payment_settings?: {
    payment_method_types?: string[]
    save_default_payment_method?: 'on_subscription' | 'off'
  }
  pending_invoice_item_interval?: {
    interval: 'day' | 'week' | 'month' | 'year'
    interval_count?: number
  }
  promotion_code?: string
  transfer_data?: {
    destination: string
    amount_percent?: number
  }
}

export interface SubscriptionConfig extends RequestConfig {
  // Subscription API endpoints
  createEndpoint?: string
  updateEndpoint?: string
  cancelEndpoint?: string
  retrieveEndpoint?: string
  listEndpoint?: string
  pauseEndpoint?: string
  resumeEndpoint?: string
  
  // Customer endpoints
  createCustomerEndpoint?: string
  updateCustomerEndpoint?: string
  retrieveCustomerEndpoint?: string
  
  // Price/Product endpoints  
  createPriceEndpoint?: string
  createProductEndpoint?: string
  listPricesEndpoint?: string
  listProductsEndpoint?: string
  retrievePriceEndpoint?: string
  retrieveProductEndpoint?: string
  
  // Invoice endpoints
  retrieveUpcomingInvoiceEndpoint?: string
  retrieveInvoiceEndpoint?: string
  payInvoiceEndpoint?: string
  listInvoicesEndpoint?: string
  
  // Payment method endpoints
  attachPaymentMethodEndpoint?: string
  detachPaymentMethodEndpoint?: string
  listPaymentMethodsEndpoint?: string
  retrievePaymentMethodEndpoint?: string
  
  // Default configuration
  defaultPaymentBehavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete'
  defaultCollectionMethod?: 'charge_automatically' | 'send_invoice'
  defaultProrationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
  
  // Trial defaults
  defaultTrialDays?: number
  allowTrialExtension?: boolean
  
  // Cancellation defaults
  cancelAtPeriodEnd?: boolean
  cancellationReason?: string
  
  // Webhook configuration
  webhookEndpointSecret?: string
}

export interface SubscriptionStatus {
  id: string
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  customer: string
  current_period_start: number
  current_period_end: number
  trial_start?: number
  trial_end?: number
  canceled_at?: number
  cancel_at?: number
  cancel_at_period_end: boolean
  items: {
    data: Array<{
      id: string
      price: {
        id: string
        nickname?: string
        unit_amount: number
        currency: string
        recurring: {
          interval: string
          interval_count: number
        }
      }
      quantity: number
    }>
  }
  latest_invoice?: string
  pending_setup_intent?: string
  default_payment_method?: string
  metadata: Record<string, string>
}

export interface UseSubscriptionsReturn {
  // State
  loading: Ref<boolean>
  error: Ref<StripeError | null>
  
  // Subscription management
  createSubscription: (data: CreateSubscriptionData, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  updateSubscription: (subscriptionId: string, data: UpdateSubscriptionData, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  cancelSubscription: (subscriptionId: string, config?: { cancelAtPeriodEnd?: boolean; cancellationReason?: string } & Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  retrieveSubscription: (subscriptionId: string, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  listSubscriptions: (params?: { customer?: string; price?: string; status?: string; limit?: number }, config?: Partial<SubscriptionConfig>) => Promise<{ data: SubscriptionStatus[]; has_more: boolean }>
  
  // Trial management
  startTrial: (subscriptionId: string, trialEnd: number | Date, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  endTrial: (subscriptionId: string, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  extendTrial: (subscriptionId: string, additionalDays: number, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  
  // Plan changes
  changePlan: (subscriptionId: string, newPriceId: string, config?: { prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice' } & Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  addItem: (subscriptionId: string, priceId: string, quantity?: number, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  removeItem: (subscriptionId: string, itemId: string, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  updateQuantity: (subscriptionId: string, itemId: string, quantity: number, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  
  // Renewal management
  resumeSubscription: (subscriptionId: string, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  pauseSubscription: (subscriptionId: string, pauseBehavior?: { behavior: 'mark_uncollectible' | 'keep_as_draft' | 'void' }, config?: Partial<SubscriptionConfig>) => Promise<SubscriptionStatus>
  
  // Invoice management
  getUpcomingInvoice: (customerId: string, subscriptionId?: string, config?: Partial<SubscriptionConfig>) => Promise<any>
  payInvoice: (invoiceId: string, config?: Partial<SubscriptionConfig>) => Promise<any>
  
  // Customer management
  createCustomer: (data: { email?: string; name?: string; payment_method?: string; metadata?: Record<string, string> }, config?: Partial<SubscriptionConfig>) => Promise<any>
  updateCustomer: (customerId: string, data: { email?: string; name?: string; metadata?: Record<string, string> }, config?: Partial<SubscriptionConfig>) => Promise<any>
  
  // Utility functions
  isTrialing: (subscription: SubscriptionStatus) => boolean
  isActive: (subscription: SubscriptionStatus) => boolean
  isCanceled: (subscription: SubscriptionStatus) => boolean
  isPastDue: (subscription: SubscriptionStatus) => boolean
  daysUntilRenewal: (subscription: SubscriptionStatus) => number
  daysRemainingInTrial: (subscription: SubscriptionStatus) => number
}

// ===== WEBHOOK TYPES =====

export type WebhookEventType = 
  // Customer events
  | 'customer.created' | 'customer.updated' | 'customer.deleted'
  // Subscription events  
  | 'customer.subscription.created' | 'customer.subscription.updated' 
  | 'customer.subscription.deleted' | 'customer.subscription.trial_will_end'
  | 'customer.subscription.paused' | 'customer.subscription.resumed'
  // Invoice events
  | 'invoice.created' | 'invoice.finalized' | 'invoice.payment_succeeded'
  | 'invoice.payment_failed' | 'invoice.payment_action_required'
  // Payment events
  | 'payment_intent.created' | 'payment_intent.succeeded' | 'payment_intent.payment_failed'
  | 'payment_method.attached' | 'payment_method.detached'
  // Checkout events
  | 'checkout.session.completed' | 'checkout.session.expired'
  // Setup intent events
  | 'setup_intent.created' | 'setup_intent.succeeded'

export interface WebhookEvent {
  id: string
  object: 'event'
  type: WebhookEventType
  created: number
  data: {
    object: any
    previous_attributes?: Record<string, any>
  }
  livemode: boolean
  pending_webhooks: number
  request?: {
    id: string
    idempotency_key?: string
  }
}

export interface WebhookEndpoint {
  id: string
  url: string
  enabled_events: WebhookEventType[]
  status: 'enabled' | 'disabled'
  description?: string
  metadata?: Record<string, string>
  created: number
}

export interface WebhookConfig extends RequestConfig {
  // Webhook endpoints
  createWebhookEndpoint?: string
  updateWebhookEndpoint?: string
  deleteWebhookEndpoint?: string
  listWebhookEndpoint?: string
  retrieveWebhookEndpoint?: string
  
  // Event monitoring
  listEventsEndpoint?: string
  retrieveEventEndpoint?: string
  resendEventEndpoint?: string
  
  // Configuration
  webhookSecret?: string
  enabledEvents?: WebhookEventType[]
  webhookUrl?: string
  
  // Real-time monitoring
  enableRealTimeMonitoring?: boolean
  pollingInterval?: number
  maxEvents?: number
}

export interface WebhookEventHandler {
  eventType: WebhookEventType
  handler: (event: WebhookEvent) => void | Promise<void>
  description?: string
}

export interface WebhookStats {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  lastEventTime?: number
  eventsByType: Record<WebhookEventType, number>
}

export interface UseWebhooksReturn {
  // State
  loading: Ref<boolean>
  error: Ref<StripeError | null>
  events: Ref<WebhookEvent[]>
  stats: Ref<WebhookStats>
  isMonitoring: Ref<boolean>
  
  // Webhook endpoint management
  createWebhookEndpoint: (url: string, enabledEvents: WebhookEventType[], config?: Partial<WebhookConfig>) => Promise<WebhookEndpoint>
  updateWebhookEndpoint: (endpointId: string, updates: Partial<WebhookEndpoint>, config?: Partial<WebhookConfig>) => Promise<WebhookEndpoint>
  deleteWebhookEndpoint: (endpointId: string, config?: Partial<WebhookConfig>) => Promise<void>
  listWebhookEndpoints: (config?: Partial<WebhookConfig>) => Promise<WebhookEndpoint[]>
  
  // Event monitoring
  startMonitoring: (config?: Partial<WebhookConfig>) => void
  stopMonitoring: () => void
  fetchEvents: (limit?: number, config?: Partial<WebhookConfig>) => Promise<WebhookEvent[]>
  fetchEvent: (eventId: string, config?: Partial<WebhookConfig>) => Promise<WebhookEvent>
  resendEvent: (eventId: string, endpointId: string, config?: Partial<WebhookConfig>) => Promise<void>
  
  // Event handlers
  registerEventHandler: (handler: WebhookEventHandler) => void
  unregisterEventHandler: (eventType: WebhookEventType) => void
  clearEventHandlers: () => void
  
  // Testing & debugging
  simulateEvent: (eventType: WebhookEventType, testData?: any) => Promise<WebhookEvent>
  testWebhookEndpoint: (endpointId: string, eventType: WebhookEventType) => Promise<boolean>
  validateWebhookSignature: (payload: string, signature: string, secret: string) => boolean
  
  // Utility functions
  clearEvents: () => void
  exportEvents: (format: 'json' | 'csv') => string
  filterEvents: (filter: { type?: WebhookEventType; dateFrom?: Date; dateTo?: Date }) => WebhookEvent[]
}