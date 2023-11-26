/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { default as IORedis } from 'ioredis';
import {
  Worker,
  Queue,
  QueueOptions,
  RedisConnection,
  WorkerOptions,
  Job,
  JobsOptions,
} from 'bullmq';

export abstract class Workflow<JD extends any = any, RT extends any = any> {
  #pipeline?: Pipeline<JD, RT>;

  constructor(protected pipelineConfig: BullPipelineConfig) {}

  readonly processor: (job: Job<JD, RT>) => Promise<RT> = (job) =>
    this.process(job);

  abstract process(job: Job<JD, RT>): Promise<RT>;

  async initializePipeline(pub: boolean, sub: boolean) {
    if (!this.#pipeline) {
      await RedisConnection.waitUntilReady(this.pipelineConfig.redis);
      this.#pipeline = new BullPipeline(this, this.pipelineConfig);
      await Promise.all([
        pub ? this.#pipeline.initializePublisher() : Promise.resolve(),
        sub ? this.#pipeline.initializeSubscriber() : Promise.resolve(),
      ]);
    }
    return this.#pipeline;
  }

  protected ensureReady() {
    if (!this.#pipeline) {
      throw new Error('Pipeline has not been initialized');
    }
  }

  schedule(data: JD, opts?: JobsOptions) {
    this.ensureReady();
    this.#pipeline!.schedule(data, opts);
    return this;
  }

  async shutdown() {
    if (this.#pipeline) {
      await this.#pipeline.shutdown();
    }
  }
}

export abstract class Pipeline<JD extends any = any, RT extends any = any> {
  constructor(public readonly workflow: Workflow<JD, RT>) {}

  abstract schedule(data: JD, opts?: JobsOptions): typeof this;
  async initializePublisher() {}
  async initializeSubscriber() {}
  abstract shutdown(): Promise<unknown>;
}

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

export class BullPipeline<
  JD extends any = any,
  RT extends any = any
> extends Pipeline<JD, RT> {
  #queue?: Queue<JD, RT>;
  #worker?: Worker<JD, RT>;

  get prefix(): string {
    const { env, app } = this.config;
    return `${env}:${app}:`;
  }

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

  constructor(
    workflow: Workflow<JD, RT>,
    public readonly config: BullPipelineConfig
  ) {
    super(workflow);
  }

  schedule(data: JD, opts?: JobsOptions) {
    this.queue.then(async (q) => {
      await q!.add(this.config.name, data, opts);
      // return anything here?
    });
    return this;
  }

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
}
