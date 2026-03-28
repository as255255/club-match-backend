import axios from 'axios';

const api = axios.create({
  // 👇 换成你永不宕机的 Render 云端链接！
  baseURL: 'https://club-match-backend.onrender.com/api',
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