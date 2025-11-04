<template>
  <div class="subscription-manager">
    <!-- Header -->
    <div class="header">
      <h3>{{ title }}</h3>
      <div v-if="subscription" class="status-badge" :class="getStatusClass(subscription.status)">
        {{ formatStatus(subscription.status) }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ error.message }}</p>
      <button @click="clearError" class="btn btn-secondary btn-sm">Dismiss</button>
    </div>

    <!-- Subscription Info -->
    <div v-if="subscription && !loading" class="subscription-info">
      <!-- Current Plan -->
      <div class="plan-info">
        <h4>Current Plan</h4>
        <div class="plan-details">
          <div class="plan-name">
            {{ getPlanName(subscription) }}
            <span class="plan-price">{{ formatPrice(subscription.items.data[0]) }}</span>
          </div>
          <div class="plan-billing">
            Billed {{ subscription.items.data[0].price.recurring.interval }}ly
          </div>
        </div>
      </div>

      <!-- Trial Info (if in trial) -->
      <div v-if="isTrialing(subscription)" class="trial-info">
        <div class="trial-header">
          <span class="trial-icon">🎁</span>
          <h4>Free Trial Active</h4>
        </div>
        <p>{{ daysRemainingInTrial(subscription) }} days remaining in your trial</p>
        
        <div class="trial-actions" v-if="allowTrialExtension">
          <button @click="showExtendTrialDialog = true" class="btn btn-secondary btn-sm">
            Extend Trial
          </button>
          <button @click="endTrialNow" class="btn btn-primary btn-sm">
            Start Paying Now
          </button>
        </div>
      </div>

      <!-- Billing Info -->
      <div class="billing-info">
        <h4>Billing Information</h4>
        <div class="billing-details">
          <div class="billing-row">
            <span>Current Period:</span>
            <span>{{ formatDate(subscription.current_period_start) }} - {{ formatDate(subscription.current_period_end) }}</span>
          </div>
          <div class="billing-row" v-if="!isTrialing(subscription)">
            <span>Next Renewal:</span>
            <span>{{ formatDate(subscription.current_period_end) }} ({{ daysUntilRenewal(subscription) }} days)</span>
          </div>
          <div class="billing-row" v-if="subscription.cancel_at_period_end">
            <span class="warning">⚠️ Cancels on:</span>
            <span>{{ formatDate(subscription.current_period_end) }}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <div class="primary-actions">
          <button v-if="showChangePlan" @click="showPlanChangeDialog = true" class="btn btn-primary">
            Change Plan
          </button>
          
          <button v-if="showUpdatePayment" @click="showUpdatePaymentDialog = true" class="btn btn-secondary">
            Update Payment
          </button>
        </div>

        <div class="secondary-actions">
          <button v-if="isActive(subscription) && !subscription.cancel_at_period_end" 
                  @click="showCancelDialog = true" 
                  class="btn btn-danger btn-sm">
            Cancel Subscription
          </button>
          
          <button v-if="subscription.cancel_at_period_end" 
                  @click="resumeSubscription" 
                  class="btn btn-success btn-sm">
            Resume Subscription
          </button>
          
          <button v-if="showPauseOption && isActive(subscription)" 
                  @click="pauseSubscription" 
                  class="btn btn-secondary btn-sm">
            Pause Subscription
          </button>
        </div>
      </div>
    </div>

    <!-- Plan Change Dialog -->
    <div v-if="showPlanChangeDialog" class="modal-overlay" @click="showPlanChangeDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h4>Change Plan</h4>
          <button @click="showPlanChangeDialog = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div v-if="availablePlans.length" class="plans-grid">
            <div v-for="plan in availablePlans" 
                 :key="plan.id" 
                 class="plan-option"
                 :class="{ active: plan.id === subscription?.items.data[0].price.id }"
                 @click="selectNewPlan(plan)">
              <div class="plan-name">{{ plan.nickname || plan.product.name }}</div>
              <div class="plan-price">{{ formatPlanPrice(plan) }}</div>
              <div class="plan-interval">per {{ plan.recurring.interval }}</div>
            </div>
          </div>
          <div v-else class="no-plans">
            <p>No alternative plans available. Contact support for custom options.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showPlanChangeDialog = false" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Cancel Dialog -->
    <div v-if="showCancelDialog" class="modal-overlay" @click="showCancelDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h4>Cancel Subscription</h4>
          <button @click="showCancelDialog = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to cancel your subscription?</p>
          
          <div class="cancel-options">
            <label class="radio-option">
              <input type="radio" v-model="cancelOption" value="end_of_period" />
              <span>Cancel at the end of current period ({{ subscription?.current_period_end ? formatDate(subscription.current_period_end) : '' }})</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="cancelOption" value="immediately" />
              <span>Cancel immediately (no refund)</span>
            </label>
          </div>

          <div class="cancel-reason">
            <label>Reason for cancellation (optional):</label>
            <select v-model="cancellationReason">
              <option value="">Select a reason...</option>
              <option value="too_expensive">Too expensive</option>
              <option value="missing_features">Missing features</option>
              <option value="switched_service">Switched to another service</option>
              <option value="no_longer_needed">No longer needed</option>
              <option value="technical_issues">Technical issues</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showCancelDialog = false" class="btn btn-secondary">Keep Subscription</button>
          <button @click="confirmCancel" class="btn btn-danger">Confirm Cancel</button>
        </div>
      </div>
    </div>

    <!-- Extend Trial Dialog -->
    <div v-if="showExtendTrialDialog" class="modal-overlay" @click="showExtendTrialDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h4>Extend Free Trial</h4>
          <button @click="showExtendTrialDialog = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p>Extend your free trial by additional days:</p>
          <div class="trial-extension-options">
            <button v-for="days in [3, 7, 14]" 
                    :key="days"
                    @click="extendTrial(days)"
                    class="btn btn-outline">
              {{ days }} days
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showExtendTrialDialog = false" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSubscriptions } from '@/composables/useSubscriptions'
import type { SubscriptionStatus, SubscriptionConfig } from '@/types'

// Props
interface Props {
  subscriptionId?: string
  customerId?: string
  title?: string
  config?: Partial<SubscriptionConfig>
  availablePlans?: any[]
  showChangePlan?: boolean
  showUpdatePayment?: boolean
  showPauseOption?: boolean
  allowTrialExtension?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Subscription Management',
  availablePlans: () => [],
  showChangePlan: true,
  showUpdatePayment: true,
  showPauseOption: false,
  allowTrialExtension: false,
  autoRefresh: false,
  refreshInterval: 30000
})

// Emits
interface Emits {
  subscriptionUpdated: [subscription: SubscriptionStatus]
  subscriptionCanceled: [subscription: SubscriptionStatus]
  planChanged: [subscription: SubscriptionStatus, oldPlan: string, newPlan: string]
  trialExtended: [subscription: SubscriptionStatus, additionalDays: number]
  error: [error: any]
}

const emit = defineEmits<Emits>()

// Composable
const {
  loading,
  error,
  retrieveSubscription,
  // updateSubscription, // Not used in this component
  cancelSubscription,
  resumeSubscription: resumeSub,
  pauseSubscription: pauseSub,
  changePlan,
  extendTrial: extendTrialDays,
  endTrial,
  isTrialing,
  isActive,
  daysUntilRenewal,
  daysRemainingInTrial
} = useSubscriptions(props.config)

// State
const subscription = ref<SubscriptionStatus | null>(null)
const loadingMessage = ref('Loading subscription...')
const showPlanChangeDialog = ref(false)
const showCancelDialog = ref(false)
const showExtendTrialDialog = ref(false)
const showUpdatePaymentDialog = ref(false)
const cancelOption = ref('end_of_period')
const cancellationReason = ref('')

// Methods
const loadSubscription = async () => {
  if (!props.subscriptionId) return
  
  try {
    loadingMessage.value = 'Loading subscription details...'
    subscription.value = await retrieveSubscription(props.subscriptionId)
  } catch (err: any) {
    emit('error', err)
  }
}

const selectNewPlan = async (plan: any) => {
  if (!props.subscriptionId || !subscription.value) return
  
  try {
    loadingMessage.value = 'Changing plan...'
    const oldPlan = subscription.value.items.data[0].price.id
    const updatedSubscription = await changePlan(props.subscriptionId, plan.id)
    
    subscription.value = updatedSubscription
    emit('planChanged', updatedSubscription, oldPlan, plan.id)
    emit('subscriptionUpdated', updatedSubscription)
    showPlanChangeDialog.value = false
  } catch (err: any) {
    emit('error', err)
  }
}

const confirmCancel = async () => {
  if (!props.subscriptionId || !subscription.value) return
  
  try {
    loadingMessage.value = 'Canceling subscription...'
    const cancelAtPeriodEnd = cancelOption.value === 'end_of_period'
    
    const canceledSubscription = await cancelSubscription(props.subscriptionId, {
      cancelAtPeriodEnd,
      cancellationReason: cancellationReason.value
    })
    
    subscription.value = canceledSubscription
    emit('subscriptionCanceled', canceledSubscription)
    emit('subscriptionUpdated', canceledSubscription)
    showCancelDialog.value = false
  } catch (err: any) {
    emit('error', err)
  }
}

const resumeSubscription = async () => {
  if (!props.subscriptionId) return
  
  try {
    loadingMessage.value = 'Resuming subscription...'
    const resumedSubscription = await resumeSub(props.subscriptionId)
    subscription.value = resumedSubscription
    emit('subscriptionUpdated', resumedSubscription)
  } catch (err: any) {
    emit('error', err)
  }
}

const pauseSubscription = async () => {
  if (!props.subscriptionId) return
  
  try {
    loadingMessage.value = 'Pausing subscription...'
    const pausedSubscription = await pauseSub(props.subscriptionId)
    subscription.value = pausedSubscription
    emit('subscriptionUpdated', pausedSubscription)
  } catch (err: any) {
    emit('error', err)
  }
}

const extendTrial = async (days: number) => {
  if (!props.subscriptionId) return
  
  try {
    loadingMessage.value = `Extending trial by ${days} days...`
    const extendedSubscription = await extendTrialDays(props.subscriptionId, days)
    subscription.value = extendedSubscription
    emit('trialExtended', extendedSubscription, days)
    emit('subscriptionUpdated', extendedSubscription)
    showExtendTrialDialog.value = false
  } catch (err: any) {
    emit('error', err)
  }
}

const endTrialNow = async () => {
  if (!props.subscriptionId) return
  
  try {
    loadingMessage.value = 'Ending trial period...'
    const updatedSubscription = await endTrial(props.subscriptionId)
    subscription.value = updatedSubscription
    emit('subscriptionUpdated', updatedSubscription)
  } catch (err: any) {
    emit('error', err)
  }
}

const clearError = () => {
  error.value = null
}

// Formatting helpers
const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'Active',
    trialing: 'Free Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    unpaid: 'Unpaid'
  }
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1)
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    active: 'status-active',
    trialing: 'status-trial',
    past_due: 'status-warning',
    canceled: 'status-canceled',
    incomplete: 'status-warning',
    unpaid: 'status-error'
  }
  return classMap[status] || 'status-default'
}

const formatPrice = (item: any) => {
  const amount = item.price.unit_amount / 100
  const currency = item.price.currency.toUpperCase()
  return `${currency} $${amount.toFixed(2)}`
}

const formatPlanPrice = (plan: any) => {
  const amount = plan.unit_amount / 100
  const currency = plan.currency.toUpperCase()
  return `${currency} $${amount.toFixed(2)}`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString()
}

const getPlanName = (subscription: SubscriptionStatus) => {
  const item = subscription.items.data[0]
  return item.price.nickname || item.price.id
}

// Auto-refresh setup
let refreshIntervalId: NodeJS.Timeout | null = null

const setupAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshIntervalId = setInterval(loadSubscription, props.refreshInterval)
  }
}

const clearAutoRefresh = () => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId)
    refreshIntervalId = null
  }
}

// Lifecycle
onMounted(() => {
  loadSubscription()
  setupAutoRefresh()
})

watch(() => props.subscriptionId, () => {
  loadSubscription()
})

watch(() => props.autoRefresh, (newVal) => {
  if (newVal) {
    setupAutoRefresh()
  } else {
    clearAutoRefresh()
  }
})

// Cleanup
import { onUnmounted } from 'vue'
onUnmounted(() => {
  clearAutoRefresh()
})
</script>

<style scoped>
.subscription-manager {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header h3 {
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-active { background: #dcfce7; color: #166534; }
.status-trial { background: #fef3c7; color: #92400e; }
.status-warning { background: #fed7aa; color: #c2410c; }
.status-canceled { background: #fecaca; color: #dc2626; }
.status-error { background: #fecaca; color: #dc2626; }

.loading-state {
  text-align: center;
  padding: 40px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin-bottom: 24px;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.subscription-info {
  space-y: 24px;
}

.plan-info, .trial-info, .billing-info {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.plan-info h4, .trial-info h4, .billing-info h4 {
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.plan-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.plan-price {
  color: #6366f1;
  font-weight: 700;
  margin-left: 8px;
}

.plan-billing {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 4px;
}

.trial-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trial-icon {
  font-size: 1.25rem;
}

.trial-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.billing-details {
  space-y: 8px;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.billing-row .warning {
  color: #d97706;
  font-weight: 600;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.primary-actions, .secondary-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #555966;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-success {
  background: #059669;
  color: white;
}

.btn-success:hover {
  background: #047857;
}

.btn-outline {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-outline:hover {
  background: #f9fafb;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.plan-option {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.plan-option:hover {
  border-color: #6366f1;
}

.plan-option.active {
  border-color: #6366f1;
  background: #f0f9ff;
}

.cancel-options {
  margin: 16px 0;
  space-y: 12px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 0;
}

.cancel-reason {
  margin-top: 16px;
}

.cancel-reason label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.cancel-reason select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.trial-extension-options {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}

.no-plans {
  text-align: center;
  padding: 40px 0;
  color: #6b7280;
}
</style>