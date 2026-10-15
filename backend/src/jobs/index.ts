import { DispatchService } from '../modules/dispatch/dispatch.service';
import { logger } from '../config/logger';

let intervalHandle: NodeJS.Timeout | null = null;

export function startBackgroundJobs(intervalMs = 3000) {
  logger.info('[Jobs] Starting dispatch offer expiration background runner (every 3s)...');

  intervalHandle = setInterval(async () => {
    try {
      const expiredCount = await DispatchService.processExpiredOffers();
      if (expiredCount > 0) {
        logger.info(`[Jobs] Processed ${expiredCount} expired dispatch offer(s).`);
      }
    } catch (err: any) {
      logger.error('[Jobs] Error processing expired offers:', err);
    }
  }, intervalMs);
}

export function stopBackgroundJobs() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[Jobs] Background jobs stopped.');
  }
}
