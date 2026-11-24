## Description
Briefly explain the goal of this PR and what changes were made.

Fixes #(issue)

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring / performance improvement

## Architectural Verification
- [ ] Backend remains completely stateless (no database / server sessions introduced)
- [ ] In-memory cache items are not mutated in-place (`useClones: false` adhered to)
- [ ] LocalStorage keys strictly follow the `fs_` prefix convention
- [ ] Codeforces-dependent features are gated behind `platform === 'codeforces'`

## Testing
- [ ] Verified backend test suite: `npm test` or `npm run test:all` succeeds
- [ ] Verified friend-pick test suite (if touching filters): `npm run test:friendpick`
- [ ] Verified frontend production build: `npm run build` succeeds
- [ ] Verified forge tests (if touching forge scene): `node src/components/forge/forge.test.mjs`
- [ ] Tested locally on browser

## Checklist
- [ ] My code adheres to the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code where necessary, particularly in complex logic
- [ ] I have updated corresponding documentation if relevant

