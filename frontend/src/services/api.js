import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API ? `${API}/api` : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// LeetCode (and problem picking) can trigger a cold upstream fetch that takes
// 10-30s on Render's free tier. Keep the default short timeout for Codeforces,
// but allow these routes to finish instead of surfacing a false "no response".
const SLOW_ROUTE_TIMEOUT = 60000;

api.interceptors.response.use(
  res => res.data,
  err => {
    const data = err.response?.data;
    const ex = new Error(data?.error || err.message || 'Something went wrong.');
    if (data?.noFriendMatch) ex.noFriendMatch = true;
    if (data?.filterMode)    ex.filterMode    = data.filterMode;
    return Promise.reject(ex);
  }
);

export const pickProblem       = p  => api.post('/problems/pick',  p, { timeout: SLOW_ROUTE_TIMEOUT });
export const getDailyProblem   = p  => api.post('/problems/daily', p, { timeout: SLOW_ROUTE_TIMEOUT });
export const reattemptProblem  = p  => api.post('/problems/reattempt', p, { timeout: SLOW_ROUTE_TIMEOUT });
export const getTags           = pl => api.get(`/problems/tags?platform=${pl}`, { timeout: SLOW_ROUTE_TIMEOUT });
export const getFriendsSolved  = h  => api.post('/codeforces/friends/solved', { handles: h });
export const validateHandle    = h  => api.get(`/codeforces/user/${h}/solved`);
export const getUserStats      = h  => api.get(`/codeforces/user/${h}/stats`);

// LeetCode API methods
export const validateLCUser    = u  => api.get(`/leetcode/user/${u}/solved`, { timeout: SLOW_ROUTE_TIMEOUT });
export const getLCUserStats    = u  => api.get(`/leetcode/user/${u}/stats`, { timeout: SLOW_ROUTE_TIMEOUT });
export const getLCTags         = () => api.get('/leetcode/tags', { timeout: SLOW_ROUTE_TIMEOUT });

export default api;
