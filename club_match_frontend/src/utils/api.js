import axios from 'axios';

const api = axios.create({
  // 👇 换成你刚刚获取的 Pinggy 后端链接！记得保留 /api
  baseURL: 'https://vfzoo-117-128-37-136.a.free.pinggy.link/api',
  timeout: 10000,
});

// 请求拦截器：只负责塞 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;