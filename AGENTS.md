# AGENTS.md

Operating manual and technical guidelines for AI agents working on **SolveForge** (formerly ForgeSolve).

---

## 1. Project Overview & Mental Model

SolveForge is a competitive programming discovery and practice platform. It helps CP athletes find practice problems tailored to their skill level, track solves in real-time, collaborate through friend filtering, and build practice streaks.

### Key Tenets
1. **Stateless Backend**: The backend (`backend/`) has **no database**. It is a lightweight caching, aggregation, and filtering proxy over external APIs (Codeforces API, Alfa LeetCode API upstream with GraphQL/snapshot fallbacks) and static datasets (GeeksforGeeks).
2. **Client-Owned State**: All user state (saved handles, verified solved problem sets, friends list, history, armory trophies, active forge session, preferences) lives strictly in the browser's `localStorage` (`frontend/src/utils/localStorage.js`).
3. **Platform Capabilities**:
   - **Codeforces**: Full support (user handle validation, solve stats, friend filters with weighted pick and relaxation, live AC tracking, rating-based smart mode).
   - **LeetCode**: Live problem set discovery (3,320+ free problems across 73 official tags), user solve verification (`/solved`), rich profile analytics (`/stats`), review mode, and live AC tracking (`/api/solve/check`).
   - **GeeksforGeeks**: Curated DSA classics pool.
   - Always gate Codeforces-specific features (rating ranges, friend modes, smart mode) behind `platform === 'codeforces'`.

---

## 2. Repository Layout

This is a two-package monorepo without a root workspace manager (`npm workspaces`, `pnpm`, or `lerna` are NOT used). Each package must be installed and run independently:

```text
solveforgeclone/
├── SolveForge/                     # Main Git repository root
│   ├── .github/                    # GitHub Actions CI & PR templates
│   │   └── workflows/ci.yml        # Automated CI workflow (5 jobs)
│   ├── backend/                    # Node.js + Express API (CommonJS)
│   │   ├── routes/                 # Express routers: problems, codeforces, leetcode, solve, health
│   │   ├── services/               # API clients: codeforcesService, leetcodeService, friendsService, gfgService
│   │   ├── utils/                  # filterEngine, friendPick, cache, random
│   │   ├── tests/                  # Unit and integration test suites (*.test.js)
│   │   ├── server.js               # Entry point (port 5001)
│   │   ├── package.json
│   │   └── .env.example
│   ├── frontend/                   # React 18 + Vite 5 + Tailwind 4 (ESM)
│   │   ├── src/
│   │   │   ├── components/         # React components (filters, problem, discover, forge, handle, ui)
│   │   │   ├── hooks/              # Custom hooks (useProblemPicker, useForgeSession, useArmory, useUserHandle)
│   │   │   ├── services/api.js     # Axios client & API calls
│   │   │   ├── utils/              # localStorage helper with 'fs_' prefix
│   │   │   ├── App.jsx             # Main application orchestrator
│   │   │   └── main.jsx
│   │   ├── vite.config.js
│   │   ├── package.json
│   │   └── .env.example
│   ├── docs/                       # Architecture & API documentation
│   ├── README.md                   # Public repository documentation
│   ├── CONTRIBUTING.md             # Contributor guidelines
│   └── LICENSE                     # Apache 2.0
```

---

## 3. Development Commands & Test Suites

Always run commands inside the respective package directory:

### Backend
```bash
cd backend
npm install
npm run dev              # Runs with nodemon on port 5001
npm start                # Production node server.js

# Testing
npm test                 # Fast unit tests (filterEngine, acceptance)
npm run test:all         # Full test suite (unit + HTTP integration tests)
npm run test:friendpick  # Friend-pick indexing, modes, relaxation tests (19 tests)
npm run test:http        # Route integration tests on ephemeral port
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # Vite dev server on http://localhost:5173
npm run build            # Production build to dist/
npm run preview          # Serve production build locally

# Testing
node src/components/forge/forge.test.mjs  # 20 pure unit tests (geometry, physics, director)
```

---

## 4. Environment Variables & Ports

### Backend (`backend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5001` | Backend HTTP port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed frontend CORS origin |
| `CACHE_TTL_SECONDS` | `3600` | Codeforces cache default TTL (seconds) |
| `CF_API_BASE` | `https://codeforces.com/api` | Base URL for Codeforces API |
| `LEETCODE_API_BASE_URL` | `http://localhost:3001` | Alfa LeetCode API instance (local Docker or Render URL) |
| `LEETCODE_USE_STATIC` | `false` | When `true`, forces static problem dataset |
| `LEETCODE_CACHE_TTL_SECONDS` | `3600` | LeetCode problem set cache TTL |
| `LEETCODE_USER_CACHE_TTL_SECONDS` | `600` | LeetCode user solved & stats cache TTL |
| `FRIENDS_CACHE_TTL_SECONDS` | `600` | Friend Codeforces status cache TTL |
| `CF_REQUEST_GAP_MS` | `2100` | Polite rate-limit delay between CF API calls |
| `NODE_ENV` | `development` | Environment mode (`development` / `production` / `test`) |

### Frontend (`frontend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5001` | Backend API URL (or Render production URL) |

---

## 5. Critical Architecture Invariants & Pitfalls

### 1. In-Memory Cache Immutability (`useClones: false`)
In `backend/utils/cache.js`, `node-cache` is configured with `useClones: false` for maximum performance:
- **CRITICAL**: `useClones: false` returns cached objects and arrays **by reference**.
- **NEVER** mutate items returned from `cache.get(...)` (e.g. `problems.sort()`, `problems.pop()`, or mutating properties directly).
- Always shallow or deep copy cached arrays/objects before modifying them (`[...problems]`).

### 2. Backend Filter Pipeline Sequence
In `backend/routes/problems.js` and `backend/utils/filterEngine.js`, problem filtering executes in strict order:
1. **Tags**: Tag OR-filter (case-insensitive matching).
2. **Difficulty / Rating**: Codeforces rating range (`[minRating, maxRating]`) OR platform difficulty (`easy`, `medium`, `hard`).
3. **LeetCode User Solves**: Filter by `excludeUserSolvedSlugs` or `showOnlyUserSolvedSlugs` (show-only wins if both present).
4. **History**: Exclude problem IDs previously saved in `history`.
5. **Codeforces User Solves**: Filter by `excludeUserSolved` or `showOnlyUserSolved`.
6. **Friend Filter Rule** (`backend/utils/friendPick.js`):
   - `catchup`: Friend solved AND user has not solved.
   - `solved`: Any friend solved.
   - `stuck`: Any friend attempted without achieving AC.
7. **Relaxation Ladder**: If zero matches occur under a friend filter, the engine progressively loosens criteria (`ignoreHistory` → `rating ±200` → `rating ±400` → `dropTags`) while keeping the friend filter active.
8. **Weighted Selection**: Random selection weighted by number of matching friends (`count^1`).

### 3. Rate Limiting Architecture
- `backend/server.js` enforces `express-rate-limit` of **120 requests/minute per client IP** globally with draft-7 RFC headers.
- `/api/solve/check` enforces a tighter **20 requests/minute per client IP** limit.
- `app.set('trust proxy', 1)` is required on Render/reverse proxies so client IPs are not collapsed into a single proxy IP.
- Avoid introducing redundant per-route rate limiters on user endpoints.

### 4. SingleFlight Request Deduplication
To prevent upstream rate limit exhaustion and server strain:
- LeetCode problem set pagination uses `inFlightFetchPromise`.
- LeetCode user solved requests use `inFlightUserSolved` Map.
- LeetCode user stats requests use `inFlightUserStats` Map.
- Always clear the in-flight reference inside a `finally` block.

### 5. LocalStorage Key Names (`fs_` prefix)
All persistent frontend data uses `frontend/src/utils/localStorage.js` with the `fs_` prefix:
- `fs_filters`: Saved user filter choices.
- `fs_history`: List of recently picked problems (capped at 200).
- `fs_friends`: Array of Codeforces friend handles (up to 25).
- `fs_streak`: Daily solve streak count and last active date.
- `fs_lastRating`: Last solved problem rating (for Smart Mode).
- `fs_user_handle` / `fs_lc_handle`: Stored handles.
- `fs_user_solved_ids` / `fs_lc_solved_slugs`: Solved problems cache.
- `fs_armory`: Forged blade collection (max 60).
- `fs_forge_session`: Active practice problem and session timer.

---

## 6. Pre-Commit / Pre-PR Checklist for Agents

- [ ] Backend unit & integration tests pass: `cd SolveForge/backend && npm test && node test_friendpick.js && npm run test:all`.
- [ ] Frontend unit tests pass: `cd SolveForge/frontend && node src/components/forge/forge.test.mjs`.
- [ ] Frontend production build succeeds: `cd SolveForge/frontend && npm run build`.
- [ ] No in-memory cache mutations (`useClones: false` adhered to).
- [ ] Codeforces-only features are cleanly gated behind `platform === 'codeforces'`.
- [ ] LeetCode title slugs and Codeforces contest IDs remain distinct and properly handled.
- [ ] Error handler responses preserve JSON shape `{ error: string }`.
