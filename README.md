# ForgeSolve

A gamified platform to discover, filter, and practice competitive programming problems with real-time Codeforces and LeetCode tracking.

---

## 🚀 Live Demo

> **[✨ Try ForgeSolve Now](https://forgesolve.vercel.app)**

---

## ✨ Key Features

### 🔎 Problem Discovery & Filtering
- **Multi-Platform Problem Pool**: 12,000+ problems across **Codeforces** (9K+ live), **LeetCode** (3.3K+ live free problems with official 73-tag catalog), and **GeeksforGeeks**.
- **Smart Filters**: Numeric rating bands, difficulty levels, tag search using OR-logic.
- **Smart Mode**: Dynamically suggests problems based on your last solved problem rating (`+100` to `+400` rating bump).
- **Personalized Solved Filters**: "Exclude Solved" to discover fresh challenges or "Review Mode" to drill previously completed problems.

### 👥 Collaborative Friend Modes (Codeforces)
- **Catch-up Mode (`catchup`)**: Targets problems your friends solved that you haven't attempted or completed yet.
- **Friends' Solved (`solved`)**: Discovers problems completed by at least one friend in your roster.
- **Friend Stuck (`stuck`)**: Discovers problems where a friend submitted attempts but couldn't get accepted, letting you help or challenge them.
- **Weighted Selection**: Problems solved by multiple friends are weighted proportionally (e.g. 3 friends solved = 3× selection probability).
- **Auto-Relaxation Ladder**: If exact filters return no match, ForgeSolve automatically loosens secondary constraints (ignores history → rating `±200` → rating `±400` → drops tags) without dropping the friend filter, clearly explaining what was relaxed.
- **Friend Roster**: Add up to 25 friends with real-time status fetching and cached responses.

### ⚔️ The Forge & Submission Tracking
- **Interactive Swordsmith Experience (Tetsuji)**: The forge heats as you configure filters and strikes upon problem discovery.
- **Live Submission Verification**: Automatic upstream verification for both **Codeforces** and **LeetCode** via `/api/solve/check`.
- **Hit-Stop & Attempt Penalties**: Tracks judged failed attempts on Codeforces in real-time, providing immediate visual feedback.
- **Blade Grading & Armory**: Earn swords (Tanto, Katana, Odachi, Naginata) graded by time and attempts (**Rough**, **Tempered**, **Fine**, **Masterwork**), stored in your persistent trophy Armory.
- **Daily Streak System**: Tracks consecutive days of practice with streak milestones.

### 📈 Profile Stats & Analytics
- **Dual-Platform Support**: Connect Codeforces and LeetCode handles.
- **Rich Analytics Dashboard**: AC counts, solve rate, rank, rating distribution, monthly submission activity calendar, and top tag breakdown.

---

## 🎯 Usage Guide

### Getting Started
1. Select a platform (**Codeforces**, **LeetCode**, or **GeeksforGeeks**).
2. Set your difficulty level or rating range and select tags.
3. Click **Get Problem** (or hit `ENTER`) to forge a challenge.
4. Click **Solve this** to launch the problem page and begin your timed forge session.

### Friend Collaboration (Codeforces)
1. Add friend handles in the **Friends** sidebar panel.
2. Select your friend filter mode:
   - **No friend filter**: Standard random discovery.
   - **Friends solved, I haven't**: Catch up on problems friends completed.
   - **Friends solved**: Practice problems friends know.
   - **A friend is stuck**: Tackle problems where friends struggled.

---

## 💻 Tech Stack

### Frontend
- **React 18** + **Vite 5** — Fast modern client with HMR
- **Tailwind CSS 4** — Zero-runtime utility styling
- **Three.js** — Lazy-loaded WebGL 3D forge scene with lightweight SVG fallback
- **Lucide React** — Crisp SVG icon system
- **Axios** — HTTP client with centralized response interceptors

### Backend
- **Node.js** + **Express 4** — Stateless REST API
- **Codeforces Official API** — Live problem set, user submissions, rating analytics
- **Alfa LeetCode API Upstream** — Paginated live problem set (100/page), solved lists, profile stats
- **LeetCode Direct GraphQL Fallback** — Resilience against upstream proxy downtime
- **Node Cache** — High-performance in-memory caching with strict reference isolation
- **Express Rate Limit** — RFC-compliant draft-7 rate limiting (120 req/min global, 20 req/min solve checker)
- **SingleFlight** — In-flight promise coalescing to eliminate duplicate concurrent upstream calls

### Client Storage
- **localStorage** (`fs_*` namespace) — Manages history, armory trophies, filter state, streaks, and handles without requiring database accounts.

---

## 🏗️ Architecture

```
┌─────────────────────┐          ┌───────────────────────┐          ┌────────────────────────┐
│                     │          │                       │          │ Codeforces API         │
│  Frontend           │◄────────►│  Backend API          │◄────────►│ (Queued 2.1s Gap)      │
│  (React 18 / Vite)  │  HTTPS   │  (Stateless Express)  │  HTTPS   ├────────────────────────┤
│  Vercel             │          │  Render (trust proxy) │          │ Alfa LeetCode API /    │
│                     │          │                       │          │ LeetCode GraphQL       │
└─────────────────────┘          └───────────────────────┘          └────────────────────────┘
```

---

## ⚙️ Setup Instructions (Local Development)

### Prerequisites
- Node.js 20+ and npm
- Docker (optional, for local self-hosted LeetCode API)

### 1. Clone Repository
```bash
git clone https://github.com/PranshuPujara/ForgeSolve.git
cd ForgeSolve
```

### 2. (Optional) Run Local LeetCode API Container
```bash
docker run -d -p 3001:3000 alfaarghya/alfa-leetcode-api:2.0.4
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev      # Running on http://localhost:5001
```

### 4. Frontend Setup
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev      # Running on http://localhost:5173
```

---

## 🧪 Testing Suite & CI

SolveForge includes comprehensive automated testing:

```bash
# Run backend unit tests (filterEngine, acceptance)
cd backend && npm test

# Run friend-pick indexing and relaxation test suite (19 tests)
cd backend && npm run test:friendpick

# Run full backend test suite (unit + HTTP route integration)
cd backend && npm run test:all

# Run forge math, physics, and director unit tests
cd frontend && node src/components/forge/forge.test.mjs

# Verify frontend production build
cd frontend && npm run build
```

### GitHub Actions CI
All commits and pull requests to `main` are continuously verified by a 5-job GitHub Actions pipeline:
1. **Backend Tests**: Matrix across Node.js 20 and 22.
2. **Backend Syntax & Structure**: `node --check` and module resolution verification.
3. **Frontend Production Build**: `vite build` validation.
4. **Forge Unit Tests**: ESM math, kinematics, and state machine tests.
5. **Security Audit**: Dependency vulnerability auditing.

---

## 📚 Documentation & Developer Guides

- **[Agent Guide (AGENTS.md)](./AGENTS.md)**: Operating rules, technical invariants, and guidelines for AI agents
- **[System Architecture (docs/ARCHITECTURE.md)](./docs/ARCHITECTURE.md)**: System design, data flow diagrams, caching lifecycle, and fallback mechanisms
- **[API Specification (docs/API.md)](./docs/API.md)**: Complete REST endpoint documentation, schemas, and error codes
- **[Contributing Guide (CONTRIBUTING.md)](./CONTRIBUTING.md)**: Development setup, branch guidelines, and PR workflow
- **[Code of Conduct (CODE_OF_CONDUCT.md)](./CODE_OF_CONDUCT.md)**: Contributor Covenant v2.1
- **[Security Policy (SECURITY.md)](./SECURITY.md)**: Vulnerability disclosure instructions

---

## 📄 License

Apache-2.0. See LICENSE file for details.

**Note**: The ForgeSolve name and logo are not available for reuse without explicit permission.

---

## 👤 Author

**Pranshu Pujara**
- GitHub: [@PranshuPujara](https://github.com/PranshuPujara)
- LinkedIn: [Pranshu Pujara](https://www.linkedin.com/in/pranshu-pujara-2a0564376/)
