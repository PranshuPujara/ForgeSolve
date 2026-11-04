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
- [ ] Verified frontend production build: `npm run build` succeeds
- [ ] Verified backend server starts and routes function: `npm run dev`
- [ ] Tested locally on browser

## Checklist
- [ ] My code adheres to the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code where necessary, particularly in complex logic
- [ ] I have updated corresponding documentation if relevant

