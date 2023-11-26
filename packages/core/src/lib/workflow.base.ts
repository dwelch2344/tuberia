import { Pipeline, Job } from './pipeline.base';

export abstract class AbstractWorkflow<
  JD,
  RT,
  PL extends Pipeline<JD, RT>,
  PC = unknown,
  JO = unknown,
  WF extends new (
    workflow: AbstractWorkflow<JD, RT, PL, PC, JO>,
    config: PC
  ) => PL = new (
    workflow: AbstractWorkflow<JD, RT, PL, PC, JO>,
    config: PC
  ) => PL
> {
  #pipeline?: Pipeline<JD, RT>;
  constructor(protected pipelineConfig: PC, protected pipelineClass: WF) {}

  readonly processor: (job: Job<JD, RT>) => Promise<RT> = (job) =>
    this.process(job);

  abstract process(job: Job<JD, RT>): Promise<RT>;

  async initializePipeline(pub: boolean, sub: boolean) {
    if (!this.#pipeline) {
      this.#pipeline = new this.pipelineClass(this, this.pipelineConfig);
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

  schedule(data: JD, opts?: JO) {
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
