import { AbstractWorkflow } from './workflow.base';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Job<DT, RT> {}

export abstract class Pipeline<JD, RT, PC = unknown, JO = unknown> {
  constructor(
    public readonly workflow: AbstractWorkflow<
      JD,
      RT,
      Pipeline<JD, RT>,
      PC,
      JO
    >,
    public readonly config: PC
  ) {}

  abstract schedule(data: JD, opts?: JO): typeof this;
  async initializePublisher() {}
  async initializeSubscriber() {}
  abstract shutdown(): Promise<unknown>;
}
