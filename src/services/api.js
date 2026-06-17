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
    initBinary: async (params) => {
      const url = buildUrl('/api/animation/init', { ...params, binary: 1 });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
      const buf = await res.arrayBuffer();
      const dv = new DataView(buf);
      let offset = 0;
      const rainCount = dv.getUint32(offset, true); offset += 4;
      const trailLength = dv.getUint32(offset, true); offset += 4;
      const splashCount = dv.getUint32(offset, true); offset += 4;
      const letterCount = dv.getUint32(offset, true); offset += 4;
      const rainFloor = dv.getFloat32(offset, true); offset += 4;
      const rainCeil = dv.getFloat32(offset, true); offset += 4;
      const rainIntensity = dv.getFloat32(offset, true); offset += 4;

      const posLen = rainCount * 3;
      const velLen = rainCount * 3;
      const letterLen = letterCount * 2;

      const positions = new Float32Array(buf, offset, posLen); offset += posLen * 4;
      const velocities = new Float32Array(buf, offset, velLen); offset += velLen * 4;
      const letterFlat = new Float32Array(buf, offset, letterLen); offset += letterLen * 4;

      const letterVelocities = [];
      for (let i = 0; i < letterCount; i++) {
        letterVelocities.push({ vx: letterFlat[i * 2], vy: letterFlat[i * 2 + 1] });
      }

      return {
        rainCount,
        trailLength,
        splashCount,
        rainFloor,
        rainCeil,
        rainIntensity,
        rainPositions: new Float32Array(positions),
        rainVelocities: new Float32Array(velocities),
        letterVelocities,
        physics: {
          gravity: 0.08,
          devicePixelRatio: Number(params.devicePixelRatio) || 1,
          isMobile: params.isMobile === 'true' || params.isMobile === true,
        },
      };
    },
  };
}

export const api = new ApiService(API_BASE_URL);

if (typeof window !== 'undefined') {
  window.api = api;
}
