<template>
  <div class="webhook-monitor">
    <div class="webhook-header">
      <h3>Stripe Webhook Monitor</h3>
      <div class="webhook-controls">
        <button 
          @click="isMonitoring ? stopMonitoring() : startMonitoring()"
          :class="['monitoring-btn', isMonitoring ? 'stop' : 'start']"
          :disabled="loading"
        >
          {{ isMonitoring ? '⏹️ Stop' : '▶️ Start' }} Monitoring
        </button>
        <button @click="refreshEvents" :disabled="loading" class="refresh-btn">
          🔄 Refresh
        </button>
        <button @click="clearEvents" class="clear-btn">
          🗑️ Clear
        </button>
        <button @click="exportData('json')" class="export-btn">
          📥 Export JSON
        </button>
      </div>
    </div>

    <div class="webhook-stats">
      <div class="stat-card">
        <div class="stat-number">{{ stats.totalEvents }}</div>
        <div class="stat-label">Total Events</div>
      </div>
      <div class="stat-card success">
        <div class="stat-number">{{ stats.successfulEvents }}</div>
        <div class="stat-label">Successful</div>
      </div>
      <div class="stat-card error">
        <div class="stat-number">{{ stats.failedEvents }}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ formatDate(stats.lastEventTime) }}</div>
        <div class="stat-label">Last Event</div>
      </div>
    </div>

    <div class="webhook-filters">
      <select v-model="selectedEventType" class="filter-select">
        <option value="">All Event Types</option>
        <option v-for="eventType in eventTypes" :key="eventType" :value="eventType">
          {{ eventType }}
        </option>
      </select>
      <input 
        v-model="searchTerm" 
        type="text" 
        placeholder="Search events..." 
        class="search-input"
      >
    </div>

    <div v-if="error" class="error-message">
      <strong>Error:</strong> {{ error.message }}
    </div>

    <div v-if="loading && !isMonitoring" class="loading">
      Loading webhook events...
    </div>

    <div class="webhook-events">
      <div 
        v-for="event in filteredEvents" 
        :key="event.id"
        :class="['event-card', getEventTypeClass(event.type)]"
        @click="selectEvent(event)"
      >
        <div class="event-header">
          <span class="event-type">{{ event.type }}</span>
          <span class="event-time">{{ formatDate(event.created) }}</span>
          <span :class="['event-status', event.livemode ? 'live' : 'test']">
            {{ event.livemode ? 'LIVE' : 'TEST' }}
          </span>
        </div>
        <div class="event-id">{{ event.id }}</div>
        <div v-if="event.pending_webhooks > 0" class="pending-webhooks">
          ⏳ {{ event.pending_webhooks }} pending
        </div>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div v-if="selectedEvent" class="event-modal" @click.self="closeEventModal">
      <div class="event-modal-content">
        <div class="event-modal-header">
          <h4>{{ selectedEvent.type }}</h4>
          <button @click="closeEventModal" class="close-btn">✕</button>
        </div>
        <div class="event-modal-body">
          <div class="event-detail-section">
            <h5>Event Information</h5>
            <div class="event-details">
              <div><strong>ID:</strong> {{ selectedEvent.id }}</div>
              <div><strong>Type:</strong> {{ selectedEvent.type }}</div>
              <div><strong>Created:</strong> {{ formatDate(selectedEvent.created) }}</div>
              <div><strong>Live Mode:</strong> {{ selectedEvent.livemode ? 'Yes' : 'No' }}</div>
              <div><strong>Pending Webhooks:</strong> {{ selectedEvent.pending_webhooks }}</div>
            </div>
          </div>
          
          <div class="event-detail-section">
            <h5>Event Data</h5>
            <pre class="event-data">{{ JSON.stringify(selectedEvent.data, null, 2) }}</pre>
          </div>
          
          <div v-if="selectedEvent.data.previous_attributes" class="event-detail-section">
            <h5>Previous Attributes</h5>
            <pre class="event-data">{{ JSON.stringify(selectedEvent.data.previous_attributes, null, 2) }}</pre>
          </div>
        </div>
        <div class="event-modal-actions">
          <button @click="simulateSelectedEvent" class="simulate-btn">
            🧪 Simulate Event
          </button>
          <button @click="copyEventData" class="copy-btn">
            📋 Copy Data
          </button>
        </div>
      </div>
    </div>

    <!-- Webhook Testing Panel -->
    <div v-if="showTestingPanel" class="testing-panel">
      <h4>Webhook Testing</h4>
      <div class="testing-controls">
        <select v-model="testEventType" class="test-select">
          <option value="">Select Event Type</option>
          <option v-for="eventType in eventTypes" :key="eventType" :value="eventType">
            {{ eventType }}
          </option>
        </select>
        <button @click="simulateTestEvent" :disabled="!testEventType" class="test-btn">
          🧪 Simulate Event
        </button>
      </div>
      <textarea 
        v-model="customTestData"
        placeholder="Custom test data (JSON)..."
        class="test-data-input"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useWebhooks } from '@/composables/useWebhooks'
import type { WebhookEvent, WebhookEventType } from '@/types'

interface Props {
  config?: any
  maxEvents?: number
  autoStart?: boolean
  showTesting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxEvents: 100,
  autoStart: false,
  showTesting: true
})

// Composable
const {
  loading,
  error,
  events,
  stats,
  isMonitoring,
  startMonitoring,
  stopMonitoring,
  fetchEvents,
  clearEvents,
  exportEvents,
  simulateEvent,
  registerEventHandler
} = useWebhooks(props.config)

// Component state
const selectedEvent = ref<WebhookEvent | null>(null)
const selectedEventType = ref<string>('')
const searchTerm = ref<string>('')
const showTestingPanel = ref(props.showTesting)
const testEventType = ref<WebhookEventType | ''>('')
const customTestData = ref<string>('')

// Event types for filtering
const eventTypes: WebhookEventType[] = [
  'customer.created', 'customer.updated', 'customer.deleted',
  'customer.subscription.created', 'customer.subscription.updated',
  'customer.subscription.deleted', 'customer.subscription.trial_will_end',
  'invoice.created', 'invoice.finalized', 'invoice.payment_succeeded',
  'invoice.payment_failed', 'payment_intent.created', 'payment_intent.succeeded',
  'checkout.session.completed', 'checkout.session.expired'
]

// Computed
const filteredEvents = computed(() => {
  let filtered = events.value

  if (selectedEventType.value) {
    filtered = filtered.filter(event => event.type === selectedEventType.value)
  }

  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(event =>
      event.id.toLowerCase().includes(search) ||
      event.type.toLowerCase().includes(search)
    )
  }

  return filtered.slice(0, props.maxEvents)
})

// Methods
const refreshEvents = async () => {
  await fetchEvents(props.maxEvents)
}

const selectEvent = (event: WebhookEvent) => {
  selectedEvent.value = event
}

const closeEventModal = () => {
  selectedEvent.value = null
}

const getEventTypeClass = (eventType: string): string => {
  if (eventType.includes('failed') || eventType.includes('expired')) return 'error'
  if (eventType.includes('succeeded') || eventType.includes('completed')) return 'success'
  if (eventType.includes('trial') || eventType.includes('created')) return 'info'
  return 'default'
}

const formatDate = (timestamp?: number): string => {
  if (!timestamp) return 'Never'
  return new Date(timestamp * 1000).toLocaleString()
}

const exportData = (format: 'json' | 'csv') => {
  const data = exportEvents(format)
  const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `webhook-events.${format}`
  a.click()
  URL.revokeObjectURL(url)
}

const simulateTestEvent = async () => {
  if (!testEventType.value) return

  let testData = undefined
  if (customTestData.value) {
    try {
      testData = JSON.parse(customTestData.value)
    } catch (error) {
      console.error('Invalid JSON in test data:', error)
      return
    }
  }

  await simulateEvent(testEventType.value as WebhookEventType, testData)
}

const simulateSelectedEvent = async () => {
  if (!selectedEvent.value) return
  await simulateEvent(selectedEvent.value.type, selectedEvent.value.data.object)
  closeEventModal()
}

const copyEventData = () => {
  if (!selectedEvent.value) return
  navigator.clipboard.writeText(JSON.stringify(selectedEvent.value, null, 2))
}

// Register default event handlers for demo
const setupDefaultHandlers = () => {
  registerEventHandler({
    eventType: 'customer.subscription.created',
    handler: (event) => {
      console.log('🎉 New subscription created:', event.data.object.id)
    },
    description: 'Log new subscription creations'
  })

  registerEventHandler({
    eventType: 'invoice.payment_failed',
    handler: (event) => {
      console.log('❌ Payment failed:', event.data.object.id)
    },
    description: 'Log payment failures'
  })
}

// Lifecycle
onMounted(() => {
  setupDefaultHandlers()
  refreshEvents()
  
  if (props.autoStart) {
    startMonitoring()
  }
})
</script>

<style scoped>
.webhook-monitor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.webhook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.webhook-header h3 {
  margin: 0;
  color: #1a1a1a;
}

.webhook-controls {
  display: flex;
  gap: 10px;
}

.monitoring-btn, .refresh-btn, .clear-btn, .export-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.monitoring-btn.start {
  background: #28a745;
  color: white;
}

.monitoring-btn.stop {
  background: #dc3545;
  color: white;
}

.refresh-btn {
  background: #007bff;
  color: white;
}

.clear-btn {
  background: #6c757d;
  color: white;
}

.export-btn {
  background: #17a2b8;
  color: white;
}

.webhook-controls button:hover:not(:disabled) {
  opacity: 0.8;
}

.webhook-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.webhook-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 2px solid transparent;
}

.stat-card.success {
  border-color: #28a745;
}

.stat-card.error {
  border-color: #dc3545;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #1a1a1a;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
}

.webhook-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.filter-select, .search-input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.filter-select {
  min-width: 200px;
}

.search-input {
  flex: 1;
  max-width: 300px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #f5c6cb;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.webhook-events {
  display: grid;
  gap: 15px;
}

.event-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 4px solid #ddd;
}

.event-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.event-card.success {
  border-left-color: #28a745;
}

.event-card.error {
  border-left-color: #dc3545;
}

.event-card.info {
  border-left-color: #17a2b8;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-type {
  font-weight: bold;
  color: #1a1a1a;
}

.event-time {
  font-size: 12px;
  color: #6c757d;
}

.event-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.event-status.live {
  background: #dc3545;
  color: white;
}

.event-status.test {
  background: #28a745;
  color: white;
}

.event-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 5px;
}

.pending-webhooks {
  font-size: 12px;
  color: #ffc107;
  font-weight: bold;
}

.event-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.event-modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
}

.event-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ddd;
}

.event-modal-header h4 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

.event-modal-body {
  padding: 20px;
}

.event-detail-section {
  margin-bottom: 20px;
}

.event-detail-section h5 {
  margin: 0 0 10px 0;
  color: #1a1a1a;
}

.event-details {
  display: grid;
  gap: 8px;
  font-size: 14px;
}

.event-data {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 15px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 300px;
}

.event-modal-actions {
  padding: 20px;
  border-top: 1px solid #ddd;
  display: flex;
  gap: 10px;
}

.simulate-btn, .copy-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.simulate-btn {
  background: #ffc107;
  color: #1a1a1a;
}

.copy-btn {
  background: #6c757d;
  color: white;
}

.testing-panel {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.testing-panel h4 {
  margin: 0 0 15px 0;
}

.testing-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.test-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-width: 200px;
}

.test-btn {
  padding: 8px 16px;
  background: #ffc107;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-data-input {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: vertical;
}
</style>