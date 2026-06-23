export function buildAnimationConfig({ width = 900, height = 500, devicePixelRatio = 1, isMobile = false } = {}) {
  const rainCount = isMobile ? 450 : 650;
  const trailLength = isMobile ? 2 : 3;
  const rainFloor = -32;
  const rainCeil = 140;
  const splashCount = isMobile ? 80 : 100;
  const rainIntensity = 1.0;

  const rainPositions = new Float32Array(rainCount * 3);
  const rainVelocities = new Float32Array(rainCount * 3);

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
      devicePixelRatio: devicePixelRatio || 1,
      isMobile,
    },
  };
}
