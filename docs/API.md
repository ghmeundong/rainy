# Backend API Specification

## Base URL

**Development**: `http://localhost:8787`

**Production**: `https://rainy-api-production.ghmeundong.workers.dev`

## Endpoints

### Health Check

```http
GET /api/health
```

**Purpose**: Verify API is running

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

**Example**:
```bash
curl http://localhost:8787/api/health
```

---

### Animation Initialization (JSON)

```http
GET /api/animation/init
```

**Purpose**: Get initial animation configuration and random particle data

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "rainCount": 420,
  "rainPositions": [
    -25.5, 85.3,   // [x, y] for particle 0
    12.1, 120.5,   // [x, y] for particle 1
    // ... 420 particle positions (840 floats total)
  ],
  "rainVelocities": [
    0.03, -0.52,   // [vx, vy] for particle 0
    -0.05, -0.61,  // [vx, vy] for particle 1
    // ... 420 velocities (840 floats total)
  ],
  "rainFloor": -35,
  "rainCeil": 170,
  "trailLength": 3,
  "splashCount": 60,
  "rainIntensity": 1.0
}
```

**Response Headers**:
```
Content-Type: application/json
Cache-Control: public, max-age=3600
```

**Example**:
```bash
curl http://localhost:8787/api/animation/init | jq .rainCount
# Output: 420
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| rainCount | integer | Number of rain particles |
| rainPositions | float32[] | Particle [x, y] coordinates (length: rainCount * 2) |
| rainVelocities | float32[] | Particle [vx, vy] velocities (length: rainCount * 2) |
| rainFloor | float | Y-coordinate where particles respawn (die) |
| rainCeil | float | Y-coordinate where particles spawn (top) |
| trailLength | integer | Number of historical positions per particle |
| splashCount | integer | Number of splash particles on impact |
| rainIntensity | float | Visual intensity multiplier (0.0 - 1.0) |

---

### Animation Initialization (Binary)

```http
GET /api/animation/init?binary=1
```

**Purpose**: Get animation configuration in optimized binary format

**Query Parameters**:
- `binary=1` (required): Enable binary response format

**Response** (200 OK):
```
[Binary data]
```

**Binary Format**:

```
Byte Layout:
0-3:     rainCount (uint32)
4-7:     rainFloor (float32)
8-11:    rainCeil (float32)
12-15:   trailLength (uint32)
16-19:   splashCount (uint32)
20-23:   rainIntensity (float32)
24+:     rainPositions (float32[], length = rainCount * 2)
...+:    rainVelocities (float32[], length = rainCount * 2)

Total Size: 24 + (rainCount * 2 * 4) + (rainCount * 2 * 4)
          = 24 + (rainCount * 16) bytes
          ≈ 24 + 6720 = 6744 bytes (for 420 particles)
```

**Response Headers**:
```
Content-Type: application/octet-stream
Cache-Control: public, max-age=3600
```

**Example** (using fetch):
```javascript
const response = await fetch('http://localhost:8787/api/animation/init?binary=1');
const buffer = await response.arrayBuffer();

// Parse header
const view = new DataView(buffer);
const rainCount = view.getUint32(0, true);      // 420
const rainFloor = view.getFloat32(4, true);     // -35
const rainCeil = view.getFloat32(8, true);      // 170
const trailLength = view.getUint32(12, true);   // 3
const splashCount = view.getUint32(16, true);   // 60
const rainIntensity = view.getFloat32(20, true);// 1.0

// Parse arrays (24-byte offset for header)
const positions = new Float32Array(buffer, 24, rainCount * 2);
const velocities = new Float32Array(buffer, 24 + rainCount * 8, rainCount * 2);

console.log(positions[0]); // First particle x position
```

**Advantages over JSON**:
- Smaller size: ~6.7KB binary vs ~25KB JSON
- Faster parsing: Direct binary view vs JSON parse
- No string overhead

---

## Error Handling

### 4xx Client Errors

```json
{
  "error": "Invalid request",
  "status": 400
}
```

**Common Codes**:
- `400`: Invalid query parameters
- `404`: Endpoint not found
- `405`: Method not allowed

### 5xx Server Errors

```json
{
  "error": "Internal server error",
  "status": 500
}
```

**Possible Causes**:
- Configuration generation failure
- Cloudflare API error
- Worker timeout (>30s)

---

## CORS

All endpoints support CORS with:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

This allows requests from any domain.

**To restrict** (security hardening):

Edit `backend/src/index.js`:
```javascript
response.headers.set(
  'Access-Control-Allow-Origin',
  'https://ghmeundong.github.io'
);
```

---

## Caching

### Cache Headers

```
Cache-Control: public, max-age=3600
```

- Cache is **public** (shareable)
- TTL is **3600 seconds** (1 hour)
- After 1 hour, cached response is stale
- Browser re-requests from origin

### Cache Management

#### Check if cached:

```bash
curl -i http://localhost:8787/api/animation/init | grep Cache-Control
# Output: Cache-Control: public, max-age=3600

curl -i http://localhost:8787/api/animation/init | grep Age
# Output: Age: 0 (first request) or Age: 45 (45 seconds old)
```

#### Clear cache:

```bash
cd backend
npx wrangler purge-cache
```

#### Change TTL:

Edit `backend/src/index.js`:
```javascript
const ttl = 7200; // 2 hours instead of 1 hour
response.headers.set('Cache-Control', `public, max-age=${ttl}`);
```

---

## Rate Limiting

Currently **not implemented**. For production with high traffic:

1. **Per-IP limit**: e.g., 100 requests/minute
2. **Global limit**: e.g., 10,000 requests/minute
3. **User-agent blocks**: e.g., block bots

**Implementation** (add to Worker):
```javascript
// Extract IP from Cloudflare header
const ip = request.headers.get('cf-connecting-ip');

// Implement counter (use KV or Durable Objects)
const count = await CACHE.get(`rate:${ip}`);
if (count > limit) {
  return new Response('Rate limited', { status: 429 });
}
```

---

## Data Ranges

### Position Coordinates

- **X**: -50 to +50 (world units)
- **Y**: -35 (floor) to 170 (ceiling)

Example particle at center top:
```
x: 0.0
y: 170.0
```

### Velocities

- **Vx (horizontal)**: -0.06 to +0.06 (units/frame)
- **Vy (vertical)**: -0.7 to -0.45 (units/frame, negative = downward)

Example fast-falling particle drifting left:
```
vx: -0.05
vy: -0.65
```

### Intensity

- **Range**: 0.0 (invisible) to 1.0 (full intensity)
- **Usage**: Fade particles based on scroll position

---

## Integration Examples

### Fetch JSON

```javascript
async function getAnimationConfig() {
  const response = await fetch('/api/animation/init');
  const config = await response.json();
  
  console.log(`Rain count: ${config.rainCount}`);
  console.log(`First particle: x=${config.rainPositions[0]}, y=${config.rainPositions[1]}`);
  
  return config;
}
```

### Fetch Binary

```javascript
async function getAnimationConfigBinary() {
  const response = await fetch('/api/animation/init?binary=1');
  const buffer = await response.arrayBuffer();
  
  const view = new DataView(buffer);
  const rainCount = view.getUint32(0, true);
  const positions = new Float32Array(buffer, 24, rainCount * 2);
  
  console.log(`Rain count: ${rainCount}`);
  console.log(`First particle: x=${positions[0]}, y=${positions[1]}`);
  
  return { rainCount, positions };
}
```

### Fallback with Timeout

```javascript
async function getAnimationWithFallback(timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch('/api/animation/init', {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    return await response.json();
  } catch (error) {
    console.warn('API timeout, using default config');
    return getDefaultConfig(); // Fallback
  }
}

function getDefaultConfig() {
  return {
    rainCount: 420,
    rainFloor: -35,
    rainCeil: 170,
    // ... other fields
  };
}
```

---

## Performance Metrics

### Response Time

| Endpoint | Size | Time |
|----------|------|------|
| /api/health | ~20B | <10ms |
| /api/animation/init (JSON) | ~25KB | ~100-200ms |
| /api/animation/init?binary=1 | ~6.7KB | ~50-150ms |

### Caching Impact

- **First request**: No cache, full time
- **Cached request**: <5ms (from cache)
- **Stale request**: Revalidation request (~100ms), but stale content served immediately

---

## Monitoring

### Log Events

All requests are logged (visible via `wrangler tail`):

```
[2024-01-15 10:30:45] GET /api/animation/init (JSON) - 200 - 120ms
[2024-01-15 10:30:50] GET /api/animation/init?binary=1 - 200 (cached) - 5ms
[2024-01-15 10:31:00] GET /api/health - 200 - 2ms
```

### Metrics to Monitor

1. **Request Count**: Requests per minute
2. **Error Rate**: Percentage of 5xx responses
3. **Response Time**: P50, P95, P99 latencies
4. **Cache Hit Rate**: Percentage of cached vs fresh responses

---

## Future Enhancements

- [ ] Per-IP rate limiting
- [ ] Request authentication (if needed)
- [ ] Analytics tracking
- [ ] Configurable parameters (POST endpoint)
- [ ] Webhook support (notify on configuration changes)
- [ ] GraphQL alternative endpoint

---

## Support

For API issues:
1. Check `/api/health` endpoint
2. View logs: `npx wrangler tail production`
3. Check Cloudflare Dashboard for Worker errors
4. Open issue on GitHub
