/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { DummyWorkflow } from './workflow.dummy';
import { v4 } from 'uuid';
import IORedis from 'ioredis';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

const qname = v4();
const redis = new IORedis({
  maxRetriesPerRequest: null,
});
const workflow = new DummyWorkflow(qname, redis);

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

app.get('/pub', async (req, res) => {
  console.log('got pub');
  workflow.schedule({ seq: 1 });
  res.send({ message: 'scheduled' });
});

promise
  .then((e) => {
    console.log('promise resolved', e);
  })
  .catch((err) => {
    console.warn('promise failed', err);
  });

workflow
  .initializePipeline(true, true)
  .then(() => {
    console.log('listening');
    app.listen(port, host, () => {
      console.log(`[ ready ] http://${host}:${port}`);
    });
  })
  .catch((err) => {
    console.warn(err);
    process.exit(1);
  });
