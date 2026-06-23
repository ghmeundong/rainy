export function buildAnimationConfig({ width = 900, height = 500, devicePixelRatio = 1, isMobile = false } = {}) {
  // Use the "mobile" visual scale for sizes on all devices (user preference)
  // and reduce only the count on mobile devices for performance.
  const desktopRainCount = 650;
  const mobileRainCount = 480; // slightly reduced on mobile
  const rainCount = isMobile ? mobileRainCount : desktopRainCount;

  // Size scale borrowed from mobile tuning (applies to both desktop and mobile)
  const sizeScale = 0.75; // scales position spread, velocity magnitude, and spark sizes

  const trailLength = 3;
  const rainFloor = -32 * sizeScale;
  const rainCeil = 140 * sizeScale;
  const splashCount = isMobile ? 80 : 100;
  const rainIntensity = 1.0;

  const rainPositions = new Float32Array(rainCount * 3);
  const rainVelocities = new Float32Array(rainCount * 3);

  const xRange = 110 * sizeScale;
  const zRange = 60 * sizeScale;
  const vxScale = 0.16 * sizeScale;
  const vyBase = 0.5 * sizeScale;
  const vyRand = 0.8 * sizeScale;

  for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * xRange;
    const y = rainCeil - Math.random() * (rainCeil - rainFloor);
    const z = (Math.random() - 0.5) * zRange;

    rainPositions[i * 3] = x;
    rainPositions[i * 3 + 1] = y;
    rainPositions[i * 3 + 2] = z;

    rainVelocities[i * 3] = (Math.random() - 0.5) * vxScale;
    rainVelocities[i * 3 + 1] = -vyBase - Math.random() * vyRand;
    rainVelocities[i * 3 + 2] = 0;
  }

  const letterVelocities = Array.from({ length: 8 }, () => ({
    vx: (Math.random() - 0.5) * 0.8 * sizeScale,
    vy: (Math.random() - 0.5) * 0.8 * sizeScale,
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
      repulseRadius: 50 * sizeScale,
      forceStrength: 0.4 * sizeScale,
      gravity: 0.08,
      damping: 0.98,
      sparkSize: 0.3 * sizeScale,
      width,
      height,
      devicePixelRatio: devicePixelRatio || 1,
      isMobile,
    },
  };
}
