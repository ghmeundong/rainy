/**
 * API Service for communicating with backend
 * Location: src/services/api.js
 *
 * Usage:
 * import { api } from './services/api.js'
 * const animationData = await api.animation.init({ width: 1200, height: 600 })
 */

const DEFAULT_LOCAL = 'https://localhost:8787';
let API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_LOCAL;

if (typeof window !== 'undefined') {
  const host = window.location.hostname || '';
  
  // 원래 localhost를 보려고 했거나, GitHub Pages 혹은 GitHub Codespaces에서 실행 중일 때
  if (
    API_BASE_URL === DEFAULT_LOCAL || 
    /localhost/.test(API_BASE_URL) || 
    host.endsWith('.github.dev') // 👈 Codespaces 환경 대응 추가
  ) {
    // 현재 접속한 프론트엔드 URL 주소 구조를 활용해 백엔드 Codespaces 주소를 동적으로 생성
    if (host.endsWith('.github.dev')) {
  // 원래 호스트 이름에서 포트 번호(예: -5173)가 붙어 있다면 먼저 제거해 줍니다.
  const baseHost = host.replace('-5173', '').replace('.github.dev', '').replace('.app', '');
  API_BASE_URL = `https://${baseHost}-8787.app.github.dev`;
      } else if (host.endsWith('.github.io') || host === 'ghmeundong.github.io') {
      API_BASE_URL = 'https://rainy-api-production.ghmeundong.workers.dev';
    }
  }
}

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
