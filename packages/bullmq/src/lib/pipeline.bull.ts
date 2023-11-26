import { default as IORedis } from 'ioredis';
import { AbstractWorkflow, Pipeline } from '@tuberia/core';
import {
  Worker,
  Queue,
  QueueOptions,
  WorkerOptions,
  JobsOptions,
} from 'bullmq';

export interface BullPipelineConfig {
  name: string;
  redis: IORedis;
  app: string;
  env: 'local' | 'test' | 'dev' | 'prod';
  options?: {
    queue?: Omit<QueueOptions, 'connection'>;
    worker?: Omit<WorkerOptions, 'connection'>;
  };
}

export class BullPipeline<JD, RT> extends Pipeline<
  JD,
  RT,
  BullPipelineConfig,
  JobsOptions
> {
  constructor(
    workflow: AbstractWorkflow<
      JD,
      RT,
      Pipeline<JD, RT>,
      BullPipelineConfig,
      JobsOptions
    >,
    config: BullPipelineConfig
  ) {
    super(workflow, config);
  }

  get prefix(): string {
    const { env, app } = this.config;
    return `${env}:${app}:`;
  }

  schedule(data: JD, opts?: JobsOptions) {
    this.queue.then(async (q) => {
      await q!.add(this.config.name, data, opts);
      // return anything here?
    });
    return this;
  }

  // #region LIFECYCLE

  override async initializePublisher() {
    await this.worker;
  }

  override async initializeSubscriber() {
    await this.queue;
  }

  async shutdown() {
    await Promise.all([
      this.queue.then((q) => q?.close()),
      this.worker.then((w) => w?.close()),
    ]);
  }

  // #endregion LIFECYCLE

  // #region GETTERS_STATE

  protected get queue() {
    if (!this.#queue) {
      this.#queue = new Queue<JD, RT>(this.config.name, {
        ...this.config.options?.queue,
        prefix: this.prefix,
        connection: this.config.redis,
      });
    }
    return this.#queue.waitUntilReady().then(() => this.#queue);
  }

  protected get worker() {
    if (!this.#worker) {
      this.#worker = new Worker<JD, RT>(
        this.config.name,
        this.workflow.processor,
        {
          ...this.config.options?.worker,
          prefix: this.prefix,
          connection: this.config.redis,
        }
      );
    }
    return this.#worker!.waitUntilReady().then(() => this.#worker);
  }

  #queue?: Queue<JD, RT>;
  #worker?: Worker<JD, RT>;

  // #endregion GETTERS_STATE
}
