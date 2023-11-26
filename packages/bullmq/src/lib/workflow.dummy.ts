import IORedis from 'ioredis';
import EventEmitter from 'node:events';
import { JobsOptions } from 'bullmq';
import { AbstractWorkflow, Job } from '@tuberia/core';

import { BullPipeline, BullPipelineConfig } from './pipeline.bull';

export type DummyInput = { seq: number };
export type DummyReturn = { id?: string; seq: number };
export class DummyWorkflow extends AbstractWorkflow<
  DummyInput,
  DummyReturn,
  BullPipelineConfig,
  JobsOptions
> {
  override async process(
    job: Job<DummyInput, DummyReturn>
  ): Promise<DummyReturn> {
    this.processed.push(job);
    this.emitter.emit(DummyWorkflow.PROCESSED_KEY, job);
    return { id: job.id as string, seq: job.data.seq } as DummyReturn;
  }
  processed: Job<DummyInput, DummyReturn>[] = [];
  private emitter = new EventEmitter();
  static PROCESSED_KEY = 'processed';

  constructor(qname: string, redis: IORedis) {
    super(
      {
        app: 'example',
        env: 'test',
        name: qname,
        redis,
      },
      BullPipeline
    );
  }

  async addListener(l: (job: Job) => Promise<unknown>) {
    this.emitter.addListener(DummyWorkflow.PROCESSED_KEY, l);
  }
}
