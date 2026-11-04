# SolveForge API Specification

Base URL: `http://localhost:5000/api` (Local) or `https://solveforge-backend.onrender.com/api` (Production).

Global Rate Limit: **30 requests per minute per IP** across all `/api/*` endpoints.

---

## 1. Health

### `GET /api/health`
Check server status.

#### Response `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-11-04T09:45:00.000Z",
  "service": "problem-picker-api"
}
```

---

## 2. Problems

### `POST /api/problems/pick`
Select a random problem matching dynamic filter criteria.

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
  "filterMode": "none",
  "friendHandles": ["tourist", "Benq"],
  "history": ["codeforces:1900-A", "codeforces:1900-B"],
  "smartMode": false,
  "lastRating": 1400,
  "ignoreFilterMode": false,
  "excludeUserSolved": ["1900-A"],
  "showOnlyUserSolved": []
}
```

#### Field Descriptions
- `platform` *(string, optional, default: `"codeforces"`)*: `"codeforces"`, `"leetcode"`, or `"gfg"`.
- `tags` *(array of strings, optional)*: Tags to match using OR-logic.
- `minRating` / `maxRating` *(integer, optional)*: Codeforces numeric rating range.
- `difficulty` *(string, optional)*: For non-CF platforms: `"easy"`, `"medium"`, or `"hard"`.
- `filterMode` *(string, optional)*: `"none"`, `"solved"`, or `"unsolved"`.
- `friendHandles` *(array of strings, optional)*: Max 10 Codeforces handles.
- `history` *(array of strings, optional)*: Array of `"platform:id"` strings to exclude.
- `smartMode` *(boolean, optional)*: If `true` and platform is CF, overrides rating to `[lastRating + 100, lastRating + 400]`.
- `lastRating` *(integer, optional)*: Rating of last solved problem.
- `ignoreFilterMode` *(boolean, optional)*: If `true`, bypasses friend filter mode (used in "Suggest anyway").
- `excludeUserSolved` *(array of strings, optional)*: List of problem IDs already solved by logged-in user.
- `showOnlyUserSolved` *(array of strings, optional)*: "Review Mode" — only return problems present in this list.

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
    "friendsSolvedCount": 2
  },
  "meta": {
    "totalMatched": 142,
    "retriedWithoutHistory": false,
    "platform": "codeforces"
  }
}
```

#### Error Responses
- `400 Bad Request`: Unknown platform or invalid parameters.
  ```json
  { "error": "Unknown platform: hacker_rank" }
  ```
- `404 Not Found` (Friend filter mismatch):
  ```json
  {
    "noFriendMatch": true,
    "filterMode": "unsolved",
    "error": "No problems match your rating/tags AND the \"unsolved\" friend filter."
  }
  ```
- `404 Not Found` (General no match):
  ```json
  {
    "error": "No problems found matching your filters.",
    "suggestions": ["Broaden the rating range", "Remove some tag filters", "Change the filter mode"]
  }
  ```

---

### `POST /api/problems/reattempt`
Fetch a specific problem by ID for re-attempting from history.

#### Request Body
```json
{
  "platform": "codeforces",
  "problemId": "1900-B"
}
```

#### Success Response `200 OK`
```json
{
  "problem": {
    "id": "1900-B",
    "contestId": 1900,
    "index": "B",
    "name": "Laura and Operations",
    "rating": 1100,
    "tags": ["math"],
    "platform": "codeforces",
    "difficulty": "medium",
    "url": "https://codeforces.com/problemset/problem/1900/B",
    "solvedCount": 18230
  },
  "meta": {
    "isReattempt": true,
    "platform": "codeforces"
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
  "problem": { "...": "..." },
  "date": "2026-11-04",
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
  "platform": "codeforces",
  "tags": [
    "2-sat",
    "binary search",
    "bitmasks",
    "constructive algorithms",
    "dp",
    "graphs",
    "greedy"
  ]
}
```

---

## 3. Codeforces Features

### `GET /api/codeforces/user/:handle/solved`
Returns the list of solved problem IDs for a Codeforces handle.

#### Path Parameters
- `handle`: Codeforces username/handle.

#### Success Response `200 OK`
```json
{
  "handle": "tourist",
  "solvedCount": 2450,
  "solved": ["1-A", "1-B", "2-A", "..."]
}
```

---

### `GET /api/codeforces/user/:handle/stats`
Returns aggregated analytics and user profile stats. Cached in memory for 10 minutes.

#### Path Parameters
- `handle`: Codeforces username/handle.

#### Success Response `200 OK`
```json
{
  "handle": "tourist",
  "rating": 3800,
  "maxRating": 3979,
  "rank": "legendary grandmaster",
  "maxRank": "tourist",
  "avatar": "https://...",
  "country": "Belarus",
  "organization": "ITMO University",
  "friendOfCount": 54000,
  "contribution": 180,
  "registeredAt": 2009,
  "solvedCount": 2450,
  "attemptedCount": 85,
  "totalSubmissions": 4120,
  "acRate": 59,
  "topTags": [
    { "tag": "dp", "count": 680 },
    { "tag": "greedy", "count": 540 }
  ],
  "ratingDist": [
    { "rating": 800, "count": 42 },
    { "rating": 1000, "count": 65 }
  ],
  "monthlyActivity": [
    { "month": "2026-01", "count": 28 },
    { "month": "2026-02", "count": 34 }
  ],
  "currentStreak": 5,
  "maxStreak": 32
}
```

---

### `POST /api/codeforces/friends/solved`
Compute unique solved union and per-problem solved counts for a list of friends (max 10).

#### Request Body
```json
{
  "handles": ["friend1", "friend2"]
}
```

#### Success Response `200 OK`
```json
{
  "handles": ["friend1", "friend2"],
  "totalUniqueSolved": 620,
  "solvedIds": ["1000-A", "1000-B"],
  "perProblem": {
    "1000-A": 2,
    "1000-B": 1
  }
}
```

