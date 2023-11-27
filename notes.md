# Generating a new package

```bash
npx nx g library core --publishable --importPath @tuberia/core  --directory packages/core
npx nx g library bullmq --publishable --importPath @tuberia/bullmq  --directory packages/bullmq
```

### And an example app

```bash
nx g @nx/node:app --docker=true --e2eTestRunner=none --directory=packages/example-app example-app  --dry-run    # standlone webhook app
```

# BUILDING

This is where things get a little tricky. Each library should be standalone, but naturally some nested libraries will need peers (`@tuberia/bullmq` -> `@tuberia/core`).

Also, we want our deps to be published in the `package.json` accordingly.

Notes:

1. Run the lint step, which will include any deps.
   - `npx nx run bullmq:lint --fix`
2. Make typescript happy.
   - When running in the monorepo, the `<package>/tsconfig.lib.json` file is fine to use.
   - When building to package, we must create a "standalone" environment to build on:
     1. Install any of the sibling packages from npm, a la `npm i @tuberia/core` (but don't save; we just need them in `node_modules`)
     2. Invoke `buildpub` instead of `build`, utilizing `<package>/tsconfig.publish.json`. This will prevent any NX `path` declarations in `tsconfig.base.json` from taking effect.
     3. Now run: `npx nx run bullmq:publish --ver=<version> --tag=latest --otp=<otp>`
