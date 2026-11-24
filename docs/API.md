# SolveForge API Specification

Base URL: `http://localhost:5001/api` (Local) or `https://solveforge-backend.onrender.com/api` (Production).

### Rate Limiting Architecture
- **Global Rate Limit**: **120 requests per minute per IP** across all `/api/*` endpoints. Enforced using `express-rate-limit` with RFC-compliant `RateLimit-*` draft-7 headers.
- **Solve Check Rate Limit**: **20 requests per minute per IP** on `/api/solve/check` to safeguard upstream poll quotas.
- **Reverse Proxy Support**: Configured with `app.set('trust proxy', 1)` to accurately identify client IPs behind cloud load balancers (Render, Vercel).

---

## 1. Health

### `GET /api/health`
Check server status and uptime.

#### Response `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-11-24T18:00:00.000Z",
  "service": "problem-picker-api"
}
```

---

## 2. Problem Discovery

### `POST /api/problems/pick`
Select a problem matching dynamic criteria, personalized solve exclusion, and friend collaboration modes.

#### Request Headers
`Content-Type: application/json`

#### Request Body
```json
{
  "platform": "codeforces",
  "tags": ["dp", "greedy"],
  "minRating": 1200,
  "maxRating": 1600,
  "difficulty": "medium",
  "filterMode": "catchup",
  "friendHandles": ["tourist", "Benq"],
  "userHandle": "my_cf_handle",
  "history": ["codeforces:1900-A", "codeforces:1900-B"],
  "smartMode": false,
  "lastRating": 1400,
  "ignoreFilterMode": false,
  "excludeUserSolved": ["1900-A"],
  "showOnlyUserSolved": [],
  "excludeUserSolvedSlugs": [],
  "showOnlyUserSolvedSlugs": []
}
```

#### Field Descriptions
| Field | Type | Default | Description |
|---|---|---|---|
| `platform` | string | `"codeforces"` | `"codeforces"`, `"leetcode"`, or `"gfg"`. |
| `tags` | array of strings | `[]` | Algorithm/DS tags to match using OR-logic. |
| `minRating` / `maxRating` | integer | `undefined` | Codeforces rating range (`min` ≤ `max`). Supports exact ratings (`min === max`). |
| `difficulty` | string | `undefined` | For non-CF platforms: `"easy"`, `"medium"`, or `"hard"`. |
| `filterMode` | string | `"none"` | Friend filter mode: `"none"`, `"catchup"`, `"solved"`, or `"stuck"`. (Legacy `"unsolved"` maps to `"stuck"`). |
| `friendHandles` | array of strings | `[]` | Up to 25 Codeforces handles. |
| `userHandle` | string | `undefined` | Authenticated user's Codeforces handle (used in `catchup` mode to hide problems the user already solved). |
| `history` | array of strings | `[]` | Array of `"platform:id"` strings previously picked. |
| `smartMode` | boolean | `false` | If `true` and platform is CF, bumps rating to `[lastRating + 100, lastRating + 400]`. |
| `lastRating` | integer | `undefined` | Rating of the last solved problem. |
| `ignoreFilterMode` | boolean | `false` | If `true`, bypasses friend filter rules (used in "Suggest anyway"). |
| `excludeUserSolved` | array of strings | `[]` | Codeforces problem IDs (`"1900-A"`) solved by the user to exclude. |
| `showOnlyUserSolved` | array of strings | `[]` | Codeforces problem IDs for "Review Mode" (only return problems in this set). |
| `excludeUserSolvedSlugs` | array of strings | `[]` | LeetCode problem slugs (`"two-sum"`) solved by the user to exclude. |
| `showOnlyUserSolvedSlugs`| array of strings | `[]` | LeetCode problem slugs for "Review Mode". |

#### Friend Filter Modes
- **`catchup`** (*"Friends solved, I haven't"*): Returns problems where at least one friend has AC, but the user does not.
- **`solved`** (*"Friends solved"*): Returns problems where at least one friend has AC (user solve status ignored).
- **`stuck`** (*"A friend is stuck"*): Returns problems where at least one friend submitted attempts but never achieved AC. Judged per-friend (if Friend A solved it and Friend B is stuck, it still qualifies).
- **`none`**: Standard discovery without friend criteria.

#### Weighted Random Picking & Relaxation
- Matching problems are **weighted by the number of matching friends** (a problem solved by 3 friends is 3× as likely to be selected as one solved by 1 friend).
- If exact filters yield 0 matches under a friend mode, the engine executes a non-destructive **relaxation ladder**:
  1. Ignore user pick history
  2. Widen Codeforces rating range by ±200
  3. Widen Codeforces rating range by ±400
  4. Drop tag constraints
- The friend mode itself is never silently dropped; any loosening is transparently communicated via `meta.friend`.

#### Success Response `200 OK`
```json
{
  "problem": {
    "id": "1840-C",
    "contestId": 1840,
    "index": "C",
    "name": "Ski Resort",
    "rating": 1000,
    "tags": ["math", "two pointers"],
    "platform": "codeforces",
    "difficulty": "easy",
    "url": "https://codeforces.com/problemset/problem/1840/C",
    "solvedCount": 24150,
    "friendsSolvedCount": 2,
    "friendsStuckCount": 0,
    "friendsSolvedBy": ["tourist", "Benq"]
  },
  "meta": {
    "totalMatched": 142,
    "platform": "codeforces",
    "retriedWithoutHistory": false,
    "friend": {
      "mode": "catchup",
      "relaxed": [],
      "message": null,
      "failed": [],
      "needsHandle": false
    }
  }
}
```

#### Error Responses
- `400 Bad Request`:
  ```json
  { "error": "Unknown platform: hacker_rank" }
  ```
- `404 Not Found` (Friend filter mismatch, even after relaxation):
  ```json
  {
    "noFriendMatch": true,
    "filterMode": "catchup",
    "failed": [],
    "error": "No problems match your filters AND the \"catchup\" friend filter, even after loosening them."
  }
  ```
- `502 Bad Gateway` (All friend profiles unreachable):
  ```json
  {
    "friendsUnavailable": true,
    "failed": ["bad_handle1", "bad_handle2"],
    "error": "Couldn't read your friends' Codeforces activity right now. Try again in a minute, or pick without the friend filter."
  }
  ```

---

### `POST /api/problems/reattempt`
Fetch a specific problem by ID for re-attempting from local history.

#### Request Body
```json
{
  "platform": "leetcode",
  "problemId": "lc-1"
}
```
*Note: For LeetCode, supports canonical ID (`lc-1`), question ID (`1`), or title slug (`two-sum`).*

#### Success Response `200 OK`
```json
{
  "problem": {
    "id": "lc-1",
    "questionId": "1",
    "titleSlug": "two-sum",
    "name": "Two Sum",
    "difficulty": "easy",
    "tags": ["array", "hash table"],
    "platform": "leetcode",
    "rating": null,
    "url": "https://leetcode.com/problems/two-sum/",
    "isPaidOnly": false
  },
  "meta": {
    "isReattempt": true,
    "platform": "leetcode"
  }
}
```

---

### `POST /api/problems/daily`
Fetch the deterministic problem of the day based on the current UTC date.

#### Request Body
```json
{
  "platform": "codeforces",
  "tags": [],
  "minRating": 1000,
  "maxRating": 1800
}
```

#### Success Response `200 OK`
```json
{
  "problem": { "id": "1900-B", "...": "..." },
  "date": "2026-11-24",
  "meta": { "totalMatched": 1280 }
}
```

---

### `GET /api/problems/tags`
Retrieve all available tags for a given platform.

#### Query Parameters
- `platform` *(optional, default: `"codeforces"`)*: `"codeforces"`, `"leetcode"`, or `"gfg"`.

#### Success Response `200 OK`
```json
{
  "platform": "leetcode",
  "tags": [
    "array",
    "string",
    "hash table",
    "dynamic programming",
    "math"
  ]
}
```

---

## 3. Real-Time Solve Tracking

### `GET /api/solve/check`
Real-time polling endpoint to verify if an active practice problem has been accepted upstream.

Rate limited to **20 requests/minute per IP**. Always returns `Cache-Control: no-store`.

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `platform` | string | Yes | `"codeforces"` or `"leetcode"`. |
| `handle` | string | Yes | User's handle on the target platform. |
| `since` | integer | Yes | Unix epoch seconds when the session began. |
| `contestId` | integer | CF only | Contest ID for Codeforces problem. |
| `index` | string | CF only | Problem index (e.g. `"A"`). |
| `problemId` | string | CF only | Alternative to `contestId` + `index` (`"1900-A"`). |
| `slug` | string | LC only | LeetCode title slug (`"two-sum"`). |

#### Codeforces Response `200 OK`
```json
{
  "accepted": true,
  "submittedAt": 1700001234,
  "attempts": 2,
  "lastVerdict": "WRONG_ANSWER"
}
```
*`attempts` counts judged non-OK submissions since `since`, used by the forge scene for hit-stop and failure penalties.*

#### LeetCode Response `200 OK`
```json
{
  "accepted": true,
  "submittedAt": 1700001234
}
```

---

## 4. Codeforces Endpoints

### `GET /api/codeforces/user/:handle/solved`
Returns the list of verified solved problem IDs for a Codeforces handle.

#### Success Response `200 OK`
```json
{
  "handle": "tourist",
  "solvedCount": 2450,
  "solved": ["1-A", "1-B", "2-A"]
}
```

---

### `GET /api/codeforces/user/:handle/stats`
Returns aggregated analytics and user profile stats. Cached in memory for 10 minutes.

#### Success Response `200 OK`
```json
{
  "handle": "tourist",
  "rating": 3800,
  "maxRating": 3979,
  "rank": "legendary grandmaster",
  "avatar": "https://...",
  "country": "Belarus",
  "solvedCount": 2450,
  "attemptedCount": 85,
  "totalSubmissions": 4120,
  "acRate": 59,
  "topTags": [{ "tag": "dp", "count": 680 }],
  "ratingDist": [{ "rating": 800, "count": 42 }],
  "monthlyActivity": [{ "month": "2026-01", "count": 28 }],
  "currentStreak": 5,
  "maxStreak": 32
}
```

---

## 5. LeetCode Endpoints

### `GET /api/leetcode/tags`
Returns the official 73 LeetCode tags, deterministically ordered descending by problem count.

#### Success Response `200 OK`
```json
{
  "tags": [
    "array",
    "string",
    "hash table",
    "math",
    "dynamic programming"
  ]
}
```

---

### `GET /api/leetcode/status`
Returns the operational mode and problem set volume of the LeetCode service.

#### Success Response `200 OK`
```json
{
  "platform": "leetcode",
  "totalProblems": 3320,
  "mode": "live",
  "timestamp": "2026-11-24T18:00:00.000Z"
}
```

---

### `GET /api/leetcode/user/:username/solved`
Returns verified solved problem slugs for a LeetCode user. Cached for 10 minutes (`LEETCODE_USER_CACHE_TTL_SECONDS`). Uses SingleFlight in-flight deduplication to prevent duplicate upstream calls.

#### Success Response `200 OK`
```json
{
  "username": "pranshu404",
  "solvedCount": 185,
  "solvedSlugs": ["two-sum", "add-two-numbers", "3sum"]
}
```

---

### `GET /api/leetcode/user/:username/stats`
Returns aggregated profile stats, ranking, streak, and recent AC tag distribution matching the Codeforces analytics structure.

#### Success Response `200 OK`
```json
{
  "platform": "leetcode",
  "handle": "pranshu404",
  "rating": 45200,
  "rank": "Rank #45200",
  "avatar": "https://...",
  "country": "India",
  "solvedCount": 185,
  "easySolved": 75,
  "mediumSolved": 92,
  "hardSolved": 18,
  "totalSubmissions": 350,
  "acRate": 53,
  "currentStreak": 14,
  "maxStreak": 45,
  "topTags": [
    { "tag": "array", "count": 82 },
    { "tag": "hash table", "count": 45 }
  ],
  "monthlyActivity": [
    { "month": "2026-11", "count": 22 }
  ]
}
```

---

### `POST /api/leetcode/refresh`
Forces cache invalidation and triggers immediate pagination across the upstream Alfa LeetCode API.

#### Success Response `200 OK`
```json
{
  "success": true,
  "totalProblems": 3320,
  "mode": "live",
  "timestamp": "2026-11-24T18:00:00.000Z"
}
```
