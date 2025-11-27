import axios from 'axios';

const API_BASE_URL = 'http://localhost:9000'; // Adjust this to match your backend URL

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async logout() {
    // Simple logout - just remove token from localStorage
    localStorage.removeItem('authToken');
  }

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  getToken() {
    return localStorage.getItem('authToken');
  }
}

export const authService = new AuthService();
