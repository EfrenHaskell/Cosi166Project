import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Adjust this to match your backend URL

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

  async googleLogin(googleToken) {
    try {
      const response = await this.api.post('/api/auth/google', {
        token: googleToken
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get user info');
    }
  }

  async updateRole(role) {
    try {
      const response = await this.api.put('/api/auth/role', { role });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to update role');
    }
  }

  async logout() {
    try {
      await this.api.post('/api/auth/logout');
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('Logout error:', error);
      // Still remove token even if API call fails
      localStorage.removeItem('authToken');
    }
  }

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  getToken() {
    return localStorage.getItem('authToken');
  }
}

export const authService = new AuthService();
