import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

export const pickProblem     = p  => api.post('/problems/pick',  p);
export const getDailyProblem = p  => api.post('/problems/daily', p);
export const getTags         = pl => api.get(`/problems/tags?platform=${pl}`);
export const getFriendsSolved= h  => api.post('/codeforces/friends/solved', { handles: h });
export const validateHandle  = h  => api.get(`/codeforces/user/${h}/solved`);

export default api;

export const getUserStats = h => api.get(`/codeforces/user/${h}/stats`);
