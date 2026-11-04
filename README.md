# ForgeSolve

A tool to discover, filter, and practice competitive programming problems with real-time Codeforces tracking.

---

## 🚀 Live Demo

> **[✨ Try ForgeSolve Now](https://forgesolve.vercel.app)**

---

## ✨ Key Features

### 🔎 Problem Discovery & Filtering
- **Multi-Platform**: Codeforces, LeetCode, GeeksforGeeks
- **Smart Filters**: Rating range, difficulty levels, tags
- **Problem Pool**: 10K+ problems across platforms
- **Smart Mode**: Auto-adjust difficulty based on last solved problem rating
- **Tag Search**: Filter by algorithm/data structure tags

### 👥 Collaborative Features (Codeforces Only)
- **Friend Filtering**: Filter problems by what friends have solved/attempted
  - **Friends' Solved**: Only show problems your friends completed
  - **Friends' Unsolved**: Target problems your friends tried but couldn't solve
  - **Any Problem**: No friend-based restrictions
- **Add up to 10 friends**: Validate Codeforces handles and track their progress
- **Per-Problem Stats**: See how many friends solved each problem

### ⏱️ Submission Tracking
- **Real-Time Detection**: Automatically detect accepted Codeforces submissions
- **Built-In Timer**: Auto-starts when problem is picked, stops on AC verdict
- **Streak System**: Track consecutive days of solved problems
- **History Management**: Keep record of all picked problems with timestamps

### 📈 Profile Stats & Analytics
- **Rich Stats Dashboard**: Solved/Attempted counts, AC rate, streaks, rating distribution, top tags, monthly activity
- **Rank & Rating**: Color-coded badges with current/max rating
- **Profile Sync**: One-click refresh to update stats from Codeforces

### ⚙️ Personalization
- **Exclude Solved**: Hide completed problems
- **Review Mode**: Practice only solved problems
- **Local Storage**: All preferences, history, and friends persisted

## 🎯 Usage Guide

### Getting Started
1. Select a platform (Codeforces, LeetCode, or GeeksforGeeks)
2. Set difficulty range and add tags (optional)
3. Click "Pick Problem" to get a random match

### Friend Features (Codeforces)
1. Open the "Friends" panel and enter Codeforces handles
2. Choose filter mode: "Any Problem", "Friends' Unsolved", or "Friends' Solved"
3. Get problems based on your friends' activity

### Tracking Progress
- View history in the History Panel
- Enable "Exclude Solved" to hide completed problems
- Check your Streak Badge for consecutive days solved

## 💻 Tech Stack

### Frontend
- **React 18** (Vite) — Fast build tooling & HMR
- **Tailwind CSS 4** — Utility-first styling
- **Lucide React** — Lightweight SVG icons
- **Axios** — Promise-based HTTP client

### Backend
- **Node.js + Express 4** — Fast, lightweight REST API
- **Codeforces API** — Problem data, user submissions, ratings
- **LeetCode & GeeksforGeeks APIs** — Problem data
- **Node Cache** — In-memory caching (5-10 min TTL)
- **Express Rate Limit** — API protection (30 req/min)
- **Axios** — API calls with timeouts

### Data & Storage
- **Problem Dataset**: 10K+ problems across 3 platforms
- **Caching**: Problem list (10 min), user stats (10 min)
- **Client Storage**: localStorage for history, filters, friends
- **No Database**: Everything computed on-the-fly from APIs

---

## 📋 Roadmap

- [ ] User authentication and cloud storage for cross-device sync
- [ ] Problem recommendation engine based on solving history and weak tags
- [ ] LeetCode and GeeksforGeeks real-time submission tracking (currently Codeforces only)
- [ ] Timed contest mode with leaderboards
- [ ] Mobile application (iOS/Android)

---

## 🏗️ Architecture

### System Design
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Frontend       │◄────────►│  Backend API     │◄────────►│ Codeforces API  │
│  (React/Vite)   │ HTTPS    │  (Express)       │ HTTP    │  + LeetCode     │
│                 │         │                  │         │  + GeeksforGeeks│
└─────────────────┘         └──────────────────┘         └─────────────────┘
  (Vercel)                     (Render)
```

### Design Principles
- **Stateless Backend**: Express API runs on Render with auto-scaling — no server sessions
- **Client-Side State**: All user data stored in localStorage for offline access
- **Multi-Criteria Filtering**: O(n) filter engine (rating, tags, history, friend status)
- **Graceful Degradation**: Promise.allSettled() handles partial failures in friend data collection
- **Rate Limiting**: 30 requests per minute per IP to prevent abuse
- **Caching Strategy**: 10-min TTL on problem lists and user stats; fresh friend data per request
- **Parallel Processing**: Concurrent API calls for user submissions and friend data
- **Timeout Protection**: 8-10 second timeouts on external API calls

### Scaling Options
- **Database Addition**: Replace in-memory cache with Redis for distributed caching
- **Friend Batch Processing**: Queue long operations (10+ friends) asynchronously
- **Problem Pre-computation**: Periodically cache and pre-filter problem subsets
- **CDN**: Serve problem data from edge locations
- **Horizontal Scaling**: Deploy multiple backend instances behind load balancer

## 🚀 Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com)
- **Backend**: Deployed on [Render](https://render.com)

## 📚 Documentation & Developer Guides

- **[Agent Guide (AGENTS.md)](./AGENTS.md)**: Operating rules and invariants for AI agents (Devin, Claude, Copilot, Antigravity)
- **[System Architecture (docs/ARCHITECTURE.md)](./docs/ARCHITECTURE.md)**: System design, data flow diagrams, caching lifecycle, and fallback mechanisms
- **[API Specification (docs/API.md)](./docs/API.md)**: Complete REST endpoint documentation, schemas, and error codes
- **[Contributing Guide (CONTRIBUTING.md)](./CONTRIBUTING.md)**: Development setup, branch guidelines, and PR workflow
- **[Code of Conduct (CODE_OF_CONDUCT.md)](./CODE_OF_CONDUCT.md)**: Contributor Covenant v2.1
- **[Security Policy (SECURITY.md)](./SECURITY.md)**: Vulnerability disclosure instructions

## 📄 License

Apache-2.0. See LICENSE file for details.

**Note**: The ForgeSolve name and logo are not available for reuse without explicit permission.

## ⚙️ Setup Instructions (Local Development)

### Prerequisites
- Node.js 18+ and npm

### Clone & Install

```bash
git clone https://github.com/PranshuPujara/SolveForge.git
cd SolveForge

# Backend Setup
cd backend
cp .env.example .env
npm install

# Frontend Setup
cd ../frontend
cp .env.example .env
npm install
```

### Run Locally

```bash
# Terminal 1 - Backend (http://localhost:5000 or 5001)
cd backend && npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd frontend && npm run dev
```

Visit `http://localhost:5173`

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](./CONTRIBUTING.md) before opening a pull request.

## 👤 Author

**Pranshu Pujara**

- GitHub: [@PranshuPujara](https://github.com/PranshuPujara)
- LinkedIn: [Pranshu Pujara](https://www.linkedin.com/in/pranshu-pujara-2a0564376/)
