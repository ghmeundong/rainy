# Deployment Guide

## Overview

This project has two deployment targets:

1. **Frontend**: GitHub Pages (`https://ghmeundong.github.io/rainy/`)
2. **Backend**: Cloudflare Workers (`https://rainy-api-production.ghmeundong.workers.dev/`)

## Prerequisites

### GitHub Pages Setup

1. Create GitHub repository (public)
2. Enable Pages in repository settings:
   - Settings → Pages → Build and deployment
   - Source: Deploy from branch
   - Branch: `gh-pages` (auto-created on first deploy)

### Cloudflare Workers Setup

1. Create Cloudflare account
2. Create Workers project:
   - Name: `rainy-api`
   - Account type: Free (sufficient)
3. Get account ID and API token:
   - Account → API tokens → Create custom token
   - Permissions: Zone → Workers → Edit

## Deploying Frontend

### Step 1: Build

```bash
npm run build
```

Output: `dist/` directory with all assets

**Verify**:
```bash
ls dist/
# Should contain: index.html, assets/ folder, etc.
```

### Step 2: Set Production API URL

```bash
# Set the backend API URL
$env:VITE_API_URL='https://rainy-api-production.ghmeundong.workers.dev'

# Then deploy
npm run deploy
```

**What happens**:
1. `npm run build` runs automatically (predeploy script)
2. Vite embeds `VITE_API_URL` into the JavaScript bundle
3. `gh-pages` pushes `dist/` to `gh-pages` branch
4. GitHub Pages serves the content

**Verify**:
1. Visit https://ghmeundong.github.io/rainy/
2. Open DevTools → Network
3. Check for requests to production API URL
4. Rain should animate (assuming backend is deployed)

### Important: Environment Variables

The API URL is **embedded at build time**, not at runtime.

```javascript
// In vite.config.js
define: {
  'import.meta.env.VITE_API_URL': JSON.stringify(
    process.env.VITE_API_URL || 'http://localhost:8787'
  )
}
```

This means:
- ✅ Set before `npm run deploy`
- ❌ Cannot change after deployment without rebuilding

### Runtime fallback (deployed site behavior)

The frontend includes a small runtime fallback so that if the site is built with the
default local development URL (`http://localhost:8787`) but the bundle is served from
a GitHub Pages host (`*.github.io` or `ghmeundong.github.io`), the client will automatically
use the production Worker URL `https://rainy-api-production.ghmeundong.workers.dev` at runtime.

This protects common mistakes where a build accidentally embeds `localhost` and the
deployed site would otherwise try to contact a non-existent backend. Note this only
applies to the hosted frontend runtime — the canonical source of truth remains the
`VITE_API_URL` set at build time.

If you prefer strict behavior (no runtime fallback), set `VITE_API_URL` explicitly before
building and remove the runtime fallback code in `src/services/api.js`.

### Troubleshooting Frontend Deploy

| Issue | Solution |
|-------|----------|
| 404 after deploy | Check base path is `/rainy/` in vite.config.js |
| Blank page | Check browser console for JavaScript errors |
| CSS not loading | Verify asset paths in dist/index.html |
| API not found | Set VITE_API_URL before building |

## Deploying Backend

### Step 1: Prepare wrangler.toml

Location: `backend/wrangler.toml`

**Required fields**:
```toml
name = "rainy-api"
main = "src/index.js"
compatibility_date = "2024-10-02"

[env.production]
name = "rainy-api-production"
vars = { ENVIRONMENT = "production" }
```

**Optional: KV Namespace Binding** (for advanced caching)

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-namespace-id"
```

To create KV namespace:
```bash
cd backend
npx wrangler kv:namespace create rainy-cache --preview false
```

### Step 2: Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens browser for OAuth login. Grants CLI access to your account.

### Step 3: Deploy

```bash
cd backend
npm run deploy
```

**What happens**:
1. Compiles Worker code
2. Bundles with itty-router and dependencies
3. Uploads to Cloudflare
4. Routes requests to your Worker

**Verify**:

```bash
# Health check
curl https://rainy-api-production.ghmeundong.workers.dev/api/health

# Should return:
# {"status":"ok"}

# Get animation config (JSON)
curl https://rainy-api-production.ghmeundong.workers.dev/api/animation/init | head -c 100

# Get binary response
curl https://rainy-api-production.ghmeundong.workers.dev/api/animation/init?binary=1 --output config.bin
```

### Backend Secrets (if needed)

For sensitive data (API keys, etc.):

```bash
cd backend
npx wrangler secret put MY_SECRET
# Prompts for value interactively

# Use in code
const secret = env.MY_SECRET;
```

### GitHub Actions Requirements

**Node.js Version**:
- Frontend: v22 (for Vite)
- Backend: v22 (for Wrangler v4)

Specified in `.github/workflows/deploy.yml`

**Lock Files**:
- Always keep `package-lock.json` and `backend/package-lock.json` in sync
- Run `npm install` before pushing if dependencies change
- GitHub Actions uses `npm ci` (requires synchronized lock files)

**Repository Secrets**:
For automatic Cloudflare deployment, add in GitHub Settings → Secrets:

- `CF_API_TOKEN` - Cloudflare API token
- `CF_ACCOUNT_ID` - Cloudflare account ID

These values are referenced in `.github/workflows/deploy.yml` and must not be committed to git.

### Monitoring Backend

**Logs**:
```bash
npx wrangler tail production
```

Shows real-time logs from production Worker.

**Metrics**:
1. Log into Cloudflare Dashboard
2. Workers → rainy-api-production
3. Check request counts, error rates, latency

## GitHub Actions Automated Deployment

Deployments happen automatically on `git push origin main`:

**Frontend**:
- Uses GitHub Actions official Pages deployment (`actions/upload-pages-artifact` + `actions/deploy-pages`)
- Replaces gh-pages npm package (more reliable authentication)
- Time: ~2 minutes

**Backend**:
- Uses Wrangler CLI with GitHub Secrets
- Depends on frontend job completion (sequential)
- Time: ~1 minute

**Workflows**:
- `.github/workflows/ci.yml` - Tests & linting (every push)
- `.github/workflows/deploy.yml` - Deployment (main branch)

### Workflow Setup

GitHub Pages is automatically configured for Actions deployment. No manual Pages settings needed.

## Full Deployment Flow

### Complete Deployment (Both Frontend & Backend)

```bash
# 1. Backend first (dependencies for frontend)
cd backend
npm run deploy
cd ..

# 2. Verify backend is running
curl https://rainy-api-production.ghmeundong.workers.dev/api/health

# 3. Frontend with production API URL
$env:VITE_API_URL='https://rainy-api-production.ghmeundong.workers.dev'
npm run deploy

# 4. Verify frontend
open https://ghmeundong.github.io/rainy/
```

**Time**: ~2-3 minutes total
- Backend deploy: ~30 seconds
- Frontend build: ~30 seconds
- GitHub Pages deploy: ~30-60 seconds
- Pages propagation: ~2 minutes

## Rollback

### Rollback Frontend

GitHub Pages keeps history on `gh-pages` branch:

```bash
# View deploy history
git log gh-pages --oneline

# Revert to previous commit
git revert <commit-hash>
git push origin gh-pages
```

Or manually rebuild and redeploy:

```bash
git checkout main
git log --oneline  # Find the commit to revert to
git reset --hard <commit-hash>

# Rebuild and deploy
$env:VITE_API_URL='...'
npm run deploy
```

### Rollback Backend

Cloudflare Workers keeps deployment history:

```bash
cd backend
npx wrangler deployments list
npx wrangler rollback  # Interactive selection
```

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**: Three.js in separate chunk
2. **Asset Hashing**: Cache busting by default
3. **Compression**: gzip by GitHub Pages

**Bundle Size**:
```
dist/
├── index.html                    ~5KB
├── assets/
│   ├── index-xxx.css             ~5KB (gzipped)
│   ├── index-xxx.js              ~22KB (gzipped)
│   ├── jquery-xxx.js             ~94KB (gzipped)
│   └── three-xxx.js              ~736KB (gzipped)
```

**Total**: ~1.2MB uncompressed, ~150KB gzipped over network

### Backend Optimization

1. **Response Caching**: 1 hour TTL (configurable)
2. **Binary Format**: Reduce parsing overhead
3. **Cloudflare Edge**: No cold starts

**Cache Duration**:
```javascript
// In backend/src/index.js
const ttl = 3600; // 1 hour
response.headers.set('Cache-Control', `public, max-age=${ttl}`);
```

To clear cache:
```bash
cd backend
npx wrangler purge-cache
```

## Monitoring & Alerts

### Set Up Monitoring

1. **Frontend**: 
   - Google Analytics (add to index.html)
   - Sentry (for error tracking)

2. **Backend**:
   - Cloudflare Analytics
   - Wrangler tail for logs

### Health Check

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor.sh

API_URL="https://rainy-api-production.ghmeundong.workers.dev"

# Check API
curl -s "$API_URL/api/health" || echo "API DOWN"

# Check Frontend
curl -s -o /dev/null -w "%{http_code}" https://ghmeundong.github.io/rainy/ | grep 200 || echo "Frontend DOWN"
```

Run with cron for periodic checks:
```bash
0 * * * * /path/to/monitor.sh
```

## Troubleshooting Deployments

### Frontend Deploy Issues

**Problem**: "gh-pages not found after deploy"

**Solution**:
```bash
# Check if gh-pages branch exists
git branch -r | grep gh-pages

# If not, create it
npm run deploy
# This will create gh-pages branch automatically
```

**Problem**: "CSS/JS not loading after deploy"

**Solution**: Check base path in vite.config.js
```javascript
// Should be:
export default {
  base: '/rainy/'  // Trailing slash important!
}
```

### Backend Deploy Issues

**Problem**: "Unauthorized" error during deploy

**Solution**:
```bash
# Re-authenticate
npx wrangler logout
npx wrangler login
```

**Problem**: "Cannot find wrangler.toml"

**Solution**:
```bash
cd backend
npx wrangler deploy
# Must be in backend directory
```

**Problem**: "Worker shows 404"

**Solution**:
1. Verify routes in `backend/src/index.js`
2. Check wrangler.toml `main` path
3. View logs: `npx wrangler tail production`

## Security Best Practices

1. **Never commit secrets** to Git
   - Use `npx wrangler secret put` instead
   - Add `.env` to `.gitignore`

2. **CORS configuration**
   - Currently allows all origins: `Access-Control-Allow-Origin: *`
   - Restrict if sensitive data: `Access-Control-Allow-Origin: https://ghmeundong.github.io`

3. **API Rate Limiting** (not yet implemented)
   - Consider adding if heavy traffic expected

4. **Secrets in CI/CD**
   - Store API tokens in GitHub Secrets
   - Use in Actions workflows

## Continuous Deployment (Optional)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      
      # Deploy backend
      - name: Deploy Backend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: cd backend && npm run deploy
      
      # Deploy frontend with backend URL
      - name: Deploy Frontend
        env:
          VITE_API_URL: 'https://rainy-api-production.ghmeundong.workers.dev'
        run: npm run deploy
```

Setup:
1. Add `CLOUDFLARE_API_TOKEN` to GitHub Secrets
2. Push to main branch
3. Automatic deployment on push

## Next Steps

- [ ] Set up GitHub Actions for CI/CD
- [ ] Add Sentry for error tracking
- [ ] Configure Cloudflare WAF rules
- [ ] Set up analytics
- [ ] Create production monitoring dashboard
- [ ] Document runbook for on-call support

See [API.md](API.md) for backend API specification.
