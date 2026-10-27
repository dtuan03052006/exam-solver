import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data: { username: string; email: string; password: string; full_name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
};

// Documents
export const docsAPI = {
  list: (params: Record<string, any>) => api.get("/slides", { params }),
  detail: (id: number) => api.get(`/slides/${id}`),
  status: (id: number) => api.get(`/slides/${id}/status`),
  update: (id: number, data: any) => api.patch(`/slides/${id}`, data),
  remove: (id: number) => api.delete(`/slides/${id}`),
  folders: () => api.get("/slides/folders"),
  tags: () => api.get("/slides/tags"),
  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post("/slides/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }),
};

// Chat
export const chatAPI = {
  askFree: (data: { course: string; question_text: string }) =>
    api.post("/exams/ask-free", data),
};
