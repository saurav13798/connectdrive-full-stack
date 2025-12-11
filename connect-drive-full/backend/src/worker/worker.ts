// Minimal worker scaffold (BullMQ)
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ host: process.env['REDIS_HOST'] || '127.0.0.1' });

const queue = new Queue('processing', { connection });

const worker = new Worker('processing', async job => {
  console.log('Processing job:', job.name, job.data);
  // TODO: generate thumbnails, call ClamAV, index file in search
}, { connection });

console.log('Worker started');
