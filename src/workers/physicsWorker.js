// Physics worker for rain position updates
self.rng = () => Math.random();

// Worker owns buffers when received; after posting them back the worker will
// wait for main to return buffers via 'returnBuffers'. This implements a
// ping-pong ownership pattern to avoid structured cloning copies.
self.onmessage = (ev) => {
  const msg = ev.data;

  if (msg.type === 'init') {
    self.rainCount = msg.rainCount;
    // expecting ArrayBuffers transferred as msg.positionsBuffer / msg.velocitiesBuffer
    if (msg.positionsBuffer) {
      self.positions = new Float32Array(msg.positionsBuffer);
    }
    if (msg.velocitiesBuffer) {
      self.velocities = new Float32Array(msg.velocitiesBuffer);
    }
    self.rainFloor = msg.rainFloor;
    self.rainCeil = msg.rainCeil;
    self.gravity = msg.gravity ?? 0.08;
    self.waitingForBuffers = false;
    return;
  }

  if (msg.type === 'step') {
    // If we don't own buffers yet, ignore the step until buffers are returned
    if (!self.positions || !self.velocities) return;

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

    // Transfer ownership of the updated buffers back to main
    const positionsBuffer = pos.buffer;
    const velocitiesBuffer = vel.buffer;
    // mark that worker no longer owns buffers until main returns them
    self.positions = null;
    self.velocities = null;
    self.waitingForBuffers = true;

    postMessage({ type: 'update', positionsBuffer, velocitiesBuffer }, [positionsBuffer, velocitiesBuffer]);
    return;
  }

  if (msg.type === 'returnBuffers') {
    // main returns transferred buffers so worker can continue
    if (msg.positionsBuffer) self.positions = new Float32Array(msg.positionsBuffer);
    if (msg.velocitiesBuffer) self.velocities = new Float32Array(msg.velocitiesBuffer);
    self.waitingForBuffers = false;
    return;
  }
};
