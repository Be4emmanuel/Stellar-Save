import { logger } from './logger';

import type { BackupService } from './backup_service';
import type { BackupJob } from './models';


export interface SchedulerConfig {
  fullBackupIntervalMs: number; // default: 24h
  incrementalIntervalMs: number; // default: 6h
}

const DEFAULT_CONFIG: SchedulerConfig = {
  fullBackupIntervalMs: 24 * 60 * 60 * 1000,
  incrementalIntervalMs: 6 * 60 * 60 * 1000,
};

export class BackupScheduler {
  private config: SchedulerConfig;
  private service: BackupService;
  private lastFullBackupTime = 0;
  private lastIncrementalBackupTime = 0;

  constructor(service: BackupService, config: Partial<SchedulerConfig> = {}) {
    this.service = service;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if it's time for a full backup.
   * Called by BackupOrchestrator on its timer.
   */
  shouldRunFullBackup(): boolean {
    const elapsed = Date.now() - this.lastFullBackupTime;
    return elapsed >= this.config.fullBackupIntervalMs;
  }

  /**
   * Check if it's time for an incremental backup.
   * Called by BackupOrchestrator on its timer.
   */
  shouldRunIncrementalBackup(): boolean {
    const elapsed = Date.now() - this.lastIncrementalBackupTime;
    return elapsed >= this.config.incrementalIntervalMs;
  }

  /**
   * Get next scheduled time for full backup (ms from now).
   */
  getNextFullBackupTime(): number {
    const elapsed = Date.now() - this.lastFullBackupTime;
    return Math.max(0, this.config.fullBackupIntervalMs - elapsed);
  }

  /**
   * Get next scheduled time for incremental backup (ms from now).
   */
  getNextIncrementalBackupTime(): number {
    const elapsed = Date.now() - this.lastIncrementalBackupTime;
    return Math.max(0, this.config.incrementalIntervalMs - elapsed);
  }

  /**
   * Trigger a manual backup outside the schedule.
   * Returns the queued job.
   */
  async triggerManual(type: 'full' | 'incremental'): Promise<BackupJob> {
    if (type === 'full') return this.runFull();
    return this.runIncremental();
  }

  /**
   * Internal: Execute full backup and update last run time.
   */
  private async runFull(): Promise<BackupJob> {
    logger.info('[BackupScheduler] Starting full backup');
    this.lastFullBackupTime = Date.now();
    const job = await this.service.createBackup('full');
    logger.info('[BackupScheduler] Full backup queued:', job.id);
    return job;
  }

  /**
   * Internal: Execute incremental backup and update last run time.
   */
  private async runIncremental(): Promise<BackupJob> {
    const base = this.service.getLatestCompleted('full');
    const baseId = base?.id;
    logger.info('[BackupScheduler] Starting incremental backup, base:', baseId ?? 'none');
    this.lastIncrementalBackupTime = Date.now();
    const job = await this.service.createBackup('incremental', baseId);
    logger.info('[BackupScheduler] Incremental backup queued:', job.id);
    return job;
  }
}
