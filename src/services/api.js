/**
 * API Service for communicating with backend
 * Location: src/services/api.js
 *
 * Usage:
 * import { api } from './services/api.js'
 * const animationData = await api.animation.init({ width: 1200, height: 600 })
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function buildUrl(endpoint, params = {}) {
  const url = new URL(endpoint, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

class ApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  health() {
    return this.request('/api/health');
  }

  animation = {
    init: (params) => this.request(buildUrl('/api/animation/init', params)),
  };
}

export const api = new ApiService(API_BASE_URL);

if (typeof window !== 'undefined') {
  window.api = api;
}
