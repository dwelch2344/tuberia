# Generating a new package

```bash
npx nx g library core --publishable --importPath @tuberia/core  --directory packages/core
npx nx g library bullmq --publishable --importPath @tuberia/bullmq  --directory packages/bullmq
```

### And an example app

```bash
nx g @nx/node:app --docker=true --e2eTestRunner=none --directory=packages/example-app example-app  --dry-run    # standlone webhook app
```
