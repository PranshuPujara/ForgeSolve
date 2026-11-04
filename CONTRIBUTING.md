# Contributing to SolveForge

Thank you for your interest in contributing to **SolveForge**! We welcome bug reports, feature suggestions, documentation enhancements, and pull requests from developers of all experience levels.

Please review this guide before submitting a contribution.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please treat all contributors with respect, courtesy, and kindness.

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### Repository Structure
SolveForge is a lightweight monorepo containing two decoupled packages:
- `backend/` — Node.js + Express 4 REST API (CommonJS)
- `frontend/` — React 18 + Vite 5 + Tailwind CSS 4 (ES Modules)

There is no root workspace package manager; dependencies are installed independently in each directory.

---

## Local Setup Workflow

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/<your-username>/SolveForge.git
   cd SolveForge
   ```

2. **Configure Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
   *The backend starts on `http://localhost:5000` (or `PORT` defined in `.env`).*

3. **Configure Frontend** (in a separate terminal):
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   *The frontend starts on `http://localhost:5173`.*

4. **Verify Application**:
   Open `http://localhost:5173` in your browser. Verify you can pick problems and view tags.

---

## Development Guidelines

### 1. Stateless Backend Philosophy
- **Never add a database or server-side session store.** SolveForge is architected to be completely stateless.
- Heavy external datasets (such as Codeforces problem lists) are cached in memory using `node-cache`.
- **Immutability Warning**: `backend/utils/cache.js` has `useClones: false`. Objects returned from `cache.get(...)` are references. **Do not mutate them** — copy them with spread operators (`[...items]`) before filtering or modifying.

### 2. Client-Owned State
- User state (handle, solved IDs, friend handles, history, preferences) belongs in the browser's `localStorage`.
- All keys must be defined in `frontend/src/utils/localStorage.js` using the `fs_` prefix (e.g. `fs_history`, `fs_filters`).
- If you add new user state, persist it through `localStorage.js`.

### 3. Module & Syntax Rules
- **Backend**: Strict CommonJS (`require(...)` and `module.exports = ...`).
- **Frontend**: Strict ES Modules (`import` and `export`).
- Do not mix module paradigms.

### 4. Codeforces-Specific Guarding
- Codeforces provides open APIs for submissions and user stats; LeetCode and GeeksforGeeks do not.
- Always gate features that depend on Codeforces APIs (e.g. live AC solver, friend filter, smart mode, profile stats) behind `platform === 'codeforces'`.

---

## How to Add New Practice Platforms

1. Create a service file in `backend/services/<name>Service.js` exporting:
   - `getAllProblems()`: returns array of problem objects conforming to the standard schema (`id`, `name`, `rating`, `tags`, `platform`, `difficulty`, `url`).
   - `getAllTags()`: returns array of unique string tags sorted alphabetically.
2. Register the service in `backend/routes/problems.js` inside `loadProblems()` and `GET /tags`.
3. Add the platform option in `frontend/src/components/filters/PlatformSelector.jsx`.
4. Run `npm run build` in `frontend` to verify bundling.

---

## Git & Pull Request Guidelines

### Branch Naming
Use clear, descriptive branch names prefixed with the change type:
- `feat/smart-recommendations`
- `fix/friend-filter-edge-case`
- `docs/update-architecture`
- `chore/upgrade-vite`

### Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add tag search filter debounce`
- `fix: handle 404 when friend handle is non-existent`
- `docs: clarify cache TTL in AGENTS.md`
- `refactor: extract rating badge component`

### Submitting a PR
1. Ensure your code compiles cleanly:
   - In `frontend`: `npm run build`
   - In `backend`: `node -c server.js`
2. Push your branch to your fork.
3. Open a Pull Request against the `main` branch.
4. Fill out the provided [PR template](./.github/pull_request_template.md).
5. A maintainer will review your pull request shortly!

---

## Questions and Support

If you have questions or get stuck, feel free to open a [Discussion](https://github.com/PranshuPujara/SolveForge/discussions) or create an issue with the `question` label.

