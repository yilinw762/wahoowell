import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000",
  withCredentials: true,
});

export default api;