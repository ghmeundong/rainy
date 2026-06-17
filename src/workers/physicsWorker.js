// Physics worker for rain position updates
self.rng = () => Math.random();

self.onmessage = (ev) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    self.rainCount = msg.rainCount;
    self.positions = new Float32Array(msg.rainPositions);
    self.velocities = new Float32Array(msg.rainVelocities);
    self.rainFloor = msg.rainFloor;
    self.rainCeil = msg.rainCeil;
    self.gravity = msg.gravity ?? 0.08;
  }

  if (msg.type === 'step') {
    const dt = msg.dt ?? 1.0;
    const pos = self.positions;
    const vel = self.velocities;
    const n = self.rainCount;
    for (let i = 0; i < n; i++) {
      const idx = i * 3;
      vel[idx + 1] -= self.gravity * dt;
      pos[idx] += vel[idx] * dt;
      pos[idx + 1] += vel[idx + 1] * dt;
      // respawn
      if (pos[idx + 1] < self.rainFloor) {
        pos[idx + 1] = self.rainCeil;
        pos[idx] = (Math.random() - 0.5) * 100;
        vel[idx] = (Math.random() - 0.5) * 0.06;
        vel[idx + 1] = -0.45 - Math.random() * 0.25;
      }
    }

    // send back updated positions (structured-cloned)
    postMessage({ type: 'update', rainPositions: pos }, []);
  }
};
