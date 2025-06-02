import { QueueOptions } from 'bull';

export const MessagePriority = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
} as const;

export const queueConfigs = {
  campaignProcessor: {
    name: 'campaign-processor',
    concurrency: 5,
    limiter: { max: 100, duration: 1000 },
    backoff: { type: 'exponential', delay: 1000 }
  },
  messageDispatcher: {
    name: 'message-dispatcher',
    concurrency: 10,
    limiter: { max: 50, duration: 1000 },
    backoff: { type: 'exponential', delay: 2000 }
  }
};

export const defaultQueueOptions: QueueOptions = {
  limiter: {
    max: 1000,
    duration: 1000
  },
  settings: {
    lockDuration: 30000,
    stalledInterval: 30000,
    maxStalledCount: 2
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
};

export const queueManager = {
  maxConcurrentJobs: 50,
  maxMemoryUsage: 0.8,
  batchSize: 100,
  retryStrategy: {
    maxAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
}; 