import type { StripeError } from '@/types'

export class StripeApiError extends Error {
  public readonly type: string
  public readonly code?: string
  public readonly param?: string
  public readonly statusCode?: number
  public readonly requestId?: string

  constructor(error: StripeError, statusCode?: number, requestId?: string) {
    super(error.message)
    this.name = 'StripeApiError'
    this.type = error.type
    this.code = error.code
    this.param = error.param
    this.statusCode = statusCode
    this.requestId = requestId
  }
}

export class ValidationError extends Error {
  public readonly field?: string
  
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

// Error factory functions
export function createStripeError(
  type: string,
  message: string,
  code?: string,
  param?: string
): StripeError {
  return { type, message, code, param }
}

export function createValidationError(message: string, field?: string): ValidationError {
  return new ValidationError(message, field)
}

export function createConfigurationError(message: string): ConfigurationError {
  return new ConfigurationError(message)
}

// Error handling utilities
export function isStripeError(error: any): error is StripeError {
  return error && typeof error === 'object' && 'type' in error && 'message' in error
}

export function isNetworkError(error: any): boolean {
  return error instanceof TypeError && error.message.includes('fetch')
}

export function isTimeoutError(error: any): boolean {
  return error?.name === 'AbortError' || error?.code === 'TIMEOUT'
}

export function formatErrorForUser(error: any): string {
  if (isStripeError(error)) {
    return error.message
  }
  
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.'
  }
  
  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.'
  }
  
  return error?.message || 'An unexpected error occurred'
}

// Error logging utility
export function logError(error: any, context?: string): void {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    type: error.type || error.name,
    code: error.code,
    context,
    timestamp: new Date().toISOString()
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error('[Vue3StripeKit Error]', errorInfo)
  }
  
  // In production, you might want to send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}