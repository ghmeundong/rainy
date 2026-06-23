const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function parseBoolean(value) {
  return value === '1' || value === 'true';
}

function buildAnimationConfig(params) {
  const isMobile = parseBoolean(params.get('isMobile'));
  const width = Number(params.get('width')) || 900;
  const height = Number(params.get('height')) || 500;

  // Lightweight backend default: return smaller payloads to reduce compute and bandwidth.
  // Use URL param `light=0` to request the full/heavier payload from backend when needed.
  const lightMode = params.get('light') !== '0';

  const rainCount = isMobile ? (lightMode ? 300 : 450) : (lightMode ? 400 : 650);
  const trailLength = isMobile ? 2 : 3;
  const rainFloor = -32;
  const rainCeil = 140;
  const splashCount = isMobile ? 80 : 100;
  const rainIntensity = 1.0;

  // To keep the worker lightweight, do NOT generate large position/velocity arrays here.
  // The client is now the primary source of animation initialization; the worker returns
  // compact metadata and small helper arrays only. For legacy/compatibility you can
  // request the full payload by passing `?light=0` (but default is light mode).

  const letterVelocities = Array.from({ length: 8 }, () => ({
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
  }));

  return {
    rainCount,
    trailLength,
    rainFloor,
    rainCeil,
    splashCount,
    rainIntensity,
    // Do not include `rainPositions` or `rainVelocities` to avoid heavy computation
    // and large responses. Client should generate positions locally by default.
    letterVelocities,
    physics: {
      repulseRadius: isMobile ? 42 : 50,
      forceStrength: isMobile ? 0.22 : 0.4,
      gravity: 0.08,
      damping: 0.98,
      sparkSize: isMobile ? 0.2 : 0.3,
      width,
      height,
      devicePixelRatio: Number(params.get('devicePixelRatio')) || 1,
      isMobile,
    },
  };
}

function handleHealth(request) {
  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: request.headers.get('X-Environment') || 'development',
  });
}

function handleAnimationInit(request) {
  const params = new URL(request.url).searchParams;
  const animationData = buildAnimationConfig(params);
  return jsonResponse(animationData);
}

async function handleAnimationInitBinary(request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const cacheKey = new Request(request.url, { method: 'GET' });

  // Try cache
  try {
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch (e) {
    // ignore cache errors
  }


  // Build a compact binary that contains only the header and letter velocities.
  // Clients should prefer local generation; this binary is a lightweight hint.
  const animationData = buildAnimationConfig(params);

  const rainCount = animationData.rainCount;
  const trailLength = animationData.trailLength;
  const splashCount = animationData.splashCount;
  const letterCount = animationData.letterVelocities.length;

  const headerBytes = 4 * 7; // 7 uint32/float32 header values
  const letterBytes = Float32Array.BYTES_PER_ELEMENT * letterCount * 2;

  const total = headerBytes + letterBytes;
  const buffer = new ArrayBuffer(total);
  const dv = new DataView(buffer);
  let offset = 0;

  // header: rainCount, trailLength, splashCount, letterCount (uint32)
  dv.setUint32(offset, rainCount, true); offset += 4;
  dv.setUint32(offset, trailLength, true); offset += 4;
  dv.setUint32(offset, splashCount, true); offset += 4;
  dv.setUint32(offset, letterCount, true); offset += 4;
  // floats: rainFloor, rainCeil, rainIntensity
  dv.setFloat32(offset, animationData.rainFloor, true); offset += 4;
  dv.setFloat32(offset, animationData.rainCeil, true); offset += 4;
  dv.setFloat32(offset, animationData.rainIntensity, true); offset += 4;

  // letter velocities (vx, vy)
  const f32l = new Float32Array(buffer, offset, letterCount * 2);
  for (let i = 0; i < letterCount; i++) {
    f32l[i * 2] = animationData.letterVelocities[i].vx;
    f32l[i * 2 + 1] = animationData.letterVelocities[i].vy;
  }

  const resp = new Response(buffer, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/octet-stream',
    },
  });

  // cache the response (best-effort)
  try {
    const cache = caches.default;
    cache.put(cacheKey, resp.clone());
  } catch (e) {
    // ignore cache errors
  }

  return resp;
}

function handleNotFound() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '');

    if (pathname === '/api/health' && request.method === 'GET') {
      return handleHealth(request);
    }

    if (pathname === '/api/animation/init' && request.method === 'GET') {
      // support ?binary=1 or /binary path
      const params = url.searchParams;
      if (params.get('binary') === '1' || pathname.endsWith('/binary')) {
        return handleAnimationInitBinary(request);
      }
      return handleAnimationInit(request);
    }

    return handleNotFound();
  },
};
