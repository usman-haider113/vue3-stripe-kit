import type { StripeConfig, CheckoutOptions } from '@/types'

let globalConfig: StripeConfig | null = null

export function setGlobalConfig(config: StripeConfig): void {
  globalConfig = config
}

export function getGlobalConfig(): StripeConfig | null {
  return globalConfig
}

export function buildApiUrl(
  endpoint?: string, 
  options?: CheckoutOptions,
  componentOptions?: { apiEndpoint?: string }
): string {
  // Priority order (highest to lowest):
  // 1. Per-call options.apiEndpoint
  // 2. Component-level componentOptions.apiEndpoint  
  // 3. Global config baseUrl + endpoint
  // 4. Throw error - no configuration provided
  
  if (options?.apiEndpoint) {
    return options.apiEndpoint
  }
  
  if (componentOptions?.apiEndpoint) {
    return componentOptions.apiEndpoint
  }
  
  if (globalConfig?.apiBaseUrl && endpoint) {
    return `${globalConfig.apiBaseUrl}${endpoint}`
  }
  
  if (globalConfig?.apiBaseUrl && globalConfig?.checkoutEndpoint) {
    return `${globalConfig.apiBaseUrl}${globalConfig.checkoutEndpoint}`
  }
  
  if (globalConfig?.checkoutEndpoint) {
    return globalConfig.checkoutEndpoint
  }
  
  // No hardcoded fallback - force user to configure
  const endpointType = endpoint?.includes('payment-intent') ? 'payment intent' : 'checkout'
  throw new Error(
    `No ${endpointType} API endpoint configured. Please provide one of:\n` +
    `1. Global config: app.use(Vue3StripeKit, { apiBaseUrl: "...", ${endpointType.replace(' ', '')}Endpoint: "..." })\n` +
    `2. Component config: use${endpointType === 'payment intent' ? 'PaymentIntents' : 'StripeCheckout'}({ apiEndpoint: "..." })\n` +
    `3. Per-call config: create${endpointType === 'payment intent' ? 'PaymentIntent' : 'CheckoutSession'}(config, { apiEndpoint: "..." })`
  )
}

export function buildRequestHeaders(
  options?: CheckoutOptions,
  componentOptions?: { headers?: Record<string, string> }
): Record<string, string> {
  const baseHeaders = { 'Content-Type': 'application/json' }
  const globalHeaders = globalConfig?.headers || {}
  const compHeaders = componentOptions?.headers || {}
  const callHeaders = options?.headers || {}
  
  // Merge headers with priority: call > component > global > base
  return {
    ...baseHeaders,
    ...globalHeaders,
    ...compHeaders,
    ...callHeaders
  }
}

export function getRequestTimeout(
  options?: CheckoutOptions,
  componentOptions?: { timeout?: number }
): number {
  return (
    options?.timeout ||
    componentOptions?.timeout ||
    globalConfig?.requestTimeout ||
    30000 // 30 seconds default
  )
}

export function getRetryCount(
  options?: CheckoutOptions,
  componentOptions?: { retries?: number }
): number {
  return (
    options?.retries ||
    componentOptions?.retries ||
    0 // No retries by default
  )
}