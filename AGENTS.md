# AGENTS.md

Operating manual and technical guidelines for AI agents working on **SolveForge** (formerly ForgeSolve).

---

## 1. Project Overview & Mental Model

SolveForge is a competitive programming discovery and practice platform. It helps CP athletes find practice problems tailored to their skill level, track solves in real-time, collaborate through friend filtering, and build streaks.

### Key Tenets
1. **Stateless Backend**: The backend (`backend/`) has **no database**. It is a lightweight caching, aggregation, and filtering proxy over external APIs (Codeforces API) and static datasets (LeetCode, GeeksforGeeks).
2. **Client-Owned State**: All user state (saved handles, solved problem sets, friends list, history, timer, preferences) lives strictly in the browser's `localStorage` (`frontend/src/utils/localStorage.js`).
3. **Platform Asymmetry**:
   - **Codeforces**: Full support (user handle validation, solve stats, friend filters, live AC tracking, rating-based smart mode).
   - **LeetCode & GeeksforGeeks**: Problem discovery pool only (static datasets in `backend/services/`). Live tracking and friend status are Codeforces-only. Always gate CF-specific features behind `platform === 'codeforces'`.

---

## 2. Repository Layout

This is a two-package monorepo without a root workspace manager (`npm workspaces`, `pnpm`, or `lerna` are NOT used). Each package must be installed and run independently:

```text
solveforgeclone/
├── SolveForge/                     # Main Git repository root
│   ├── backend/                    # Node.js + Express API (CommonJS)
│   │   ├── routes/                 # Express routers: problems, codeforces, health
│   │   ├── services/               # API clients & static problem datasets
│   │   ├── utils/                  # filterEngine, cache, random
│   │   ├── server.js               # Entry point (port 5000 / 5001)
│   │   ├── package.json
│   │   └── .env.example
│   ├── frontend/                   # React 18 + Vite 5 + Tailwind 4 (ESM)
│   │   ├── src/
│   │   │   ├── components/         # React components (filters, problem, handle, ui)
│   │   │   ├── hooks/              # Custom hooks (useProblemPicker, useLiveSolver, etc.)
│   │   │   ├── services/api.js     # Axios client & API calls
│   │   │   ├── utils/              # localStorage helper with 'fs_' prefix
│   │   │   ├── App.jsx             # Main application orchestrator
│   │   │   └── main.jsx
│   │   ├── vite.config.js
│   │   ├── package.json
│   │   └── .env.example
│   ├── docs/                       # Architecture & API documentation
│   ├── CLAUDE.md                   # Legacy Claude Code guide
│   ├── README.md                   # Public repository documentation
│   ├── CONTRIBUTING.md             # Contributor guidelines
│   └── LICENSE                     # Apache 2.0
```

---

## 3. Development Commands

Always run commands inside the respective package directory:

### Backend
```bash
cd backend
npm install
npm run dev      # Runs with nodemon on port 5000 (or PORT env var)
npm start        # Runs production node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # Production build to dist/
npm run preview  # Serve production build locally
```

> **Testing & Linting**: There is currently no pre-configured test suite or linter. Do not invent scripts like `npm test` or `npm run lint` in pull requests unless you are explicitly adding them.

---

## 4. Environment Variables & Ports

### Backend (`backend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` (or `5001`) | Backend HTTP port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed frontend origin |
| `CACHE_TTL_SECONDS` | `3600` | In-memory cache default TTL (seconds) |
| `CF_API_BASE` | `https://codeforces.com/api` | Base URL for Codeforces API |
| `NODE_ENV` | `development` | Environment mode |

### Frontend (`frontend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend API URL (or Render production URL) |

> **Proxy Note**: `frontend/vite.config.js` proxies `/api/*` to `VITE_API_URL`. However, `frontend/src/services/api.js` also configures Axios `baseURL = ${VITE_API_URL}/api`. Keep these aligned.

---

## 5. Critical Architecture Invariants & Pitfalls

### 1. In-Memory Cache Immutability (`useClones: false`)
In `backend/utils/cache.js`, `node-cache` is configured with:
```js
const cache = new NodeCache({ useClones: false });
```
**CRITICAL**: `useClones: false` returns cached objects and arrays **by reference**.
- **NEVER** mutate items returned from `cache.get(...)` (e.g., `problems.sort()`, `problems.pop()`, or adding properties directly).
- Always shallow or deep copy cached arrays/objects before modifying them (`[...problems]`).

### 2. Backend Filter Pipeline Order
In `backend/utils/filterEngine.js` and `backend/routes/problems.js`, filters are evaluated in a strict sequence:
1. **Exclude History**: problems in user's history (`fs_history`).
2. **Tag OR-match**: matching any selected tag (case-insensitive).
3. **Difficulty / Rating**: `minRating` & `maxRating` range (CF) OR `difficulty` label (LC/GFG) — never both.
4. **Friend Filtering**: `filterMode === 'solved'` (intersect with friends' solved union) or `filterMode === 'unsolved'` (intersect with friends' attempted-not-solved union).
5. **Exclude User Solved**: exclude `excludeUserSolved` set.
6. **Show Only User Solved**: intersect with `showOnlyUserSolved` set ("Review Mode").

**Escape hatches to preserve:**
- **Retry without history**: If filtering yields 0 results and `history` was non-empty, the backend retries with empty history and sets `meta.retriedWithoutHistory = true`.
- **Friend filter short-circuit**: If friend filter mode is active and yields 0 results, the route returns `404 { noFriendMatch: true, filterMode }` **without** retrying without history. The frontend uses this to show the "Suggest Anyway" prompt.

### 3. Rate Limiting Subtleties
- `backend/server.js` imposes `express-rate-limit` of **30 requests/minute per IP** across all `/api/*` endpoints.
- If an agent performs rapid test requests, expect `429 Too Many Requests`.
- `useLiveSolver.js` in the frontend polls `https://codeforces.com/api/user.status` **directly from the browser** (every 8 seconds). It does not hit the backend and does not consume the 30 req/min backend quota.

### 4. Problem ID & Tag Conventions
- Codeforces IDs: `"${contestId}-${index}"` (e.g., `"1900-B"`).
- Frontend History Storage: `"platform:id"` (e.g., `"codeforces:1900-B"`, `"leetcode:lc-1"`). Never strip the prefix in history.
- Tag comparisons must always be case-insensitive (`.toLowerCase()`).

### 5. Module Formats
- **Backend**: strictly CommonJS (`require(...)` / `module.exports`).
- **Frontend**: strictly ES Modules (`import ... from '...'` / `export ...`).
- Do not mix them.

### 6. LocalStorage Key Names
All persistent frontend data uses `frontend/src/utils/localStorage.js` with the `fs_` prefix:
- `fs_filters`: Saved user filter choices.
- `fs_history`: List of recently picked problems (capped at 200).
- `fs_friends`: Array of Codeforces friend handles (max 10).
- `fs_streak`: Daily solve streak count and last active date.
- `fs_lastRating`: Last solved problem rating (for Smart Mode).
- `fs_user_handle`: Stored CF user handle.
- `fs_user_solved_ids`: Cached array of user solved problem IDs.
- `fs_user_solved_fetched_at`: Timestamp of last solved IDs sync (10 min TTL).
- `fs_user_stats`: Cached rich stats object.
- `fs_excludeSolved` / `fs_showOnlySolved`: Boolean toggles.
*Exception*: `live_solve_state` (no prefix) in `useLiveSolver.js` tracks ongoing AC polling across reloads.

---

## 6. How to Implement Common Changes

### Adding a new Backend Endpoint
1. Define the route in `backend/routes/problems.js` or `backend/routes/codeforces.js`.
2. Wrap async handler bodies in `try ... catch(err) { next(err); }`.
3. If fetching from external services, utilize `backend/utils/cache.js` with an appropriate TTL.
4. Expose the function in `frontend/src/services/api.js`.

### Adding a New Platform
1. Add service module in `backend/services/<name>Service.js` implementing `getAllProblems()` and `getAllTags()`.
2. Standardize problem objects:
   ```js
   {
     id: 'platform-unique-id',
     name: 'Problem Title',
     difficulty: 'easy' | 'medium' | 'hard',
     rating: null, // or number
     tags: ['tag1', 'tag2'],
     url: 'https://...',
     platform: '<name>'
   }
   ```
3. Update `loadProblems` in `backend/routes/problems.js`.
4. Update `frontend/src/components/filters/PlatformSelector.jsx`.
5. Keep live tracking and friend filtering guarded for Codeforces only unless the new platform provides equivalent public APIs.

---

## 7. Pre-Commit / Pre-PR Checklist for Agents

- [ ] Backend runs without syntax errors: `node -c SolveForge/backend/server.js` and all route/service files.
- [ ] Frontend builds cleanly: `cd SolveForge/frontend && npm run build`.
- [ ] No in-memory cache mutations (`useClones: false` adhered to).
- [ ] Codeforces-only features are cleanly gated behind `platform === 'codeforces'`.
- [ ] No database code or ORM dependencies introduced.
- [ ] Error handler responses preserve JSON shape `{ error: string }`.

