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

  const rainCount = isMobile ? 450 : 650;
  const trailLength = isMobile ? 2 : 3;
  const rainFloor = -32;
  const rainCeil = 140;
  const splashCount = isMobile ? 80 : 100;
  const rainIntensity = 1.0;

  const rainPositions = new Array(rainCount * 3);
  const rainVelocities = new Array(rainCount * 3);

  for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * 110;
    const y = rainCeil - Math.random() * (rainCeil - rainFloor);
    const z = (Math.random() - 0.5) * 60;

    rainPositions[i * 3] = x;
    rainPositions[i * 3 + 1] = y;
    rainPositions[i * 3 + 2] = z;

    rainVelocities[i * 3] = (Math.random() - 0.5) * 0.16;
    rainVelocities[i * 3 + 1] = -0.5 - Math.random() * 0.8;
    rainVelocities[i * 3 + 2] = 0;
  }

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
    rainPositions,
    rainVelocities,
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
      return handleAnimationInit(request);
    }

    return handleNotFound();
  },
};
