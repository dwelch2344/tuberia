/* eslint-disable @typescript-eslint/no-explicit-any */

import IORedis from 'ioredis';
import EventEmitter from 'node:events';
import { Job, JobsOptions } from 'bullmq';
import { AbstractWorkflow, Pipeline } from '@tuberia/core';

import { BullPipeline, BullPipelineConfig } from './pipeline.bull';

type DummyReturn = { id?: string; seq: number };
type x = new (
  workflow: AbstractWorkflow<any, any, any, any, any>,
  config: BullPipelineConfig
) => Pipeline<any, DummyReturn>;
export class DummyWorkflow extends AbstractWorkflow<
  any,
  DummyReturn,
  Pipeline<any, DummyReturn>,
  BullPipelineConfig,
  JobsOptions
> {
  // class DummyWorkflow extends AbstractWorkflow<any, DummyReturn {
  processed: Job[] = [];
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
      BullPipeline as unknown as x
    );
  }

  async process(job: Job<any, any>): Promise<DummyReturn> {
    this.processed.push(job);
    this.emitter.emit(DummyWorkflow.PROCESSED_KEY, job);
    return { id: job.id, seq: job.data.seq };
  }

  async addListener(l: (job: Job) => Promise<unknown>) {
    this.emitter.addListener(DummyWorkflow.PROCESSED_KEY, l);
  }
}
