import express from 'express';
import { HealthChecker } from './health-checker';
import { FailoverManager } from './failover-manager';
import { NotificationService } from './notification-service';
import { MetricsCollector } from './metrics-collector';

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize services
const healthChecker = new HealthChecker();
const failoverManager = new FailoverManager();
const notificationService = new NotificationService();
const metricsCollector = new MetricsCollector();

// Configuration
const CONFIG = {
  primaryRegion: process.env.PRIMARY_REGION || 'us-east-1',
  drRegion: process.env.DR_REGION || 'eu-west-1',
  dnsProvider: process.env.DNS_PROVIDER || 'route53',
  failoverThreshold: parseInt(process.env.FAILOVER_THRESHOLD || '3'),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30'),
  autoFailoverEnabled: process.env.AUTO_FAILOVER_ENABLED === 'true',
  failbackDelay: parseInt(process.env.FAILBACK_DELAY || '300'),
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const metrics = await metricsCollector.getMetrics();
  res.json(metrics);
});

// Manual failover trigger
app.post('/failover/trigger', async (req, res) => {
  try {
    await failoverManager.triggerFailover('manual');
    res.json({ status: 'success', message: 'Failover triggered successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message: errorMessage });
  }
});

// Manual failback trigger
app.post('/failover/failback', async (req, res) => {
  try {
    await failoverManager.triggerFailback();
    res.json({ status: 'success', message: 'Failback triggered successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message: errorMessage });
  }
});

// Get current status
app.get('/status', async (req, res) => {
  const status = await failoverManager.getStatus();
  res.json(status);
});

// Main health check loop
async function healthCheckLoop() {
  try {
    const primaryHealth = await healthChecker.checkRegionHealth(CONFIG.primaryRegion);
    const drHealth = await healthChecker.checkRegionHealth(CONFIG.drRegion);

    metricsCollector.recordHealthCheck(CONFIG.primaryRegion, primaryHealth);
    metricsCollector.recordHealthCheck(CONFIG.drRegion, drHealth);

    console.log(`Primary Region Health: ${primaryHealth.status}`);
    console.log(`DR Region Health: ${drHealth.status}`);

    // Check if failover is needed
    if (CONFIG.autoFailoverEnabled && primaryHealth.status === 'unhealthy') {
      const consecutiveFailures = metricsCollector.getConsecutiveFailures(CONFIG.primaryRegion);
      
      if (consecutiveFailures >= CONFIG.failoverThreshold) {
        console.log('Triggering automatic failover to DR region');
        await failoverManager.triggerFailover('automatic');
        await notificationService.sendAlert(
          'CRITICAL',
          'Automatic Failover Triggered',
          `Primary region ${CONFIG.primaryRegion} is unhealthy. Failing over to ${CONFIG.drRegion}`
        );
      }
    }

    // Check if failback is possible
    if (failoverManager.isInFailover() && primaryHealth.status === 'healthy') {
      const timeSinceFailover = Date.now() - failoverManager.getFailoverTimestamp();
      
      if (timeSinceFailover > CONFIG.failbackDelay * 1000) {
        console.log('Primary region is healthy, considering failback');
        await notificationService.sendAlert(
          'INFO',
          'Primary Region Recovered',
          `Primary region ${CONFIG.primaryRegion} is healthy. Manual failback may be initiated.`
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in health check loop:', error);
    await notificationService.sendAlert(
      'ERROR',
      'Health Check Error',
      `Error in health check loop: ${errorMessage}`
    );
  }
}

// Start health check loop
setInterval(healthCheckLoop, CONFIG.healthCheckInterval * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Failover Controller running on port ${PORT}`);
  console.log(`Auto-failover enabled: ${CONFIG.autoFailoverEnabled}`);
  console.log(`Health check interval: ${CONFIG.healthCheckInterval}s`);
  console.log(`Failover threshold: ${CONFIG.failoverThreshold}`);
});

export { app };
