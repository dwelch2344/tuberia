/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 } from 'uuid';
import { default as IORedis } from 'ioredis';

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { DummyWorkflow } from './workflow.dummy';

describe(
  'test queues',
  () => {
    let redis: IORedis;
    const qname = v4();

    let workflow: DummyWorkflow;

    beforeEach(async () => {
      redis = new IORedis({
        maxRetriesPerRequest: null,
      });
      workflow = new DummyWorkflow(qname, redis);
      await workflow.initializePipeline(true, true);
    });

    afterAll(async function () {
      await workflow.shutdown();
      await redis.quit();
    });

    it('delays work as expected', async () => {
      const results: any[] = [];

      const promise = new Promise<any[]>((resolve) => {
        workflow.addListener(async (job) => {
          results.push(job.data);
          if (results.length >= 4) {
            resolve(results.map((r) => r.seq));
          }
          return { job: job.id };
        });
      });

      workflow.schedule({ seq: 1 });
      workflow.schedule({ seq: 2 });
      workflow.schedule({ seq: 3 }, { delay: 0.5 * 1000 });
      workflow.schedule({ seq: 4 });

      const resolved = await promise;
      expect(resolved).toHaveLength(4);
      expect(resolved[0]).toBe(1);
      expect(resolved[1]).toBe(2);
      expect(resolved[2]).toBe(4);
      expect(resolved[3]).toBe(3);
    });
  },
  { timeout: 15 * 1000 }
);
