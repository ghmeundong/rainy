# Lessons Learned

## Overview

This document captures key learnings from the development and deployment process, including issues encountered and their resolutions.

---

## 1. GitHub Pages Authentication in GitHub Actions

### Problem

GitHub Actions deployment to GitHub Pages failed with:
```
fatal: could not read Username for 'https://github.com': No such device or address
```

### Root Cause

Using the `gh-pages` npm package for deployment in GitHub Actions requires proper authentication setup. The package attempts to push to the `gh-pages` branch but fails when the `GH_TOKEN` environment variable is not properly propagated or when Git credentials are not configured correctly.

### Solution

**Switched to GitHub Actions official deployment actions**:
- Replaced: `npm run deploy` (which uses gh-pages package)
- With: `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`

**Benefits**:
- ✅ Official GitHub support with built-in authentication
- ✅ No custom Git configuration needed
- ✅ Automatic branch management
- ✅ Better error handling and logging
- ✅ No need to set GH_TOKEN in environment

### Code Change

Before:
```yaml
- name: Deploy frontend to GitHub Pages
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run deploy
```

After:
```yaml
- name: Upload artifact to GitHub Pages
  uses: actions/upload-pages-artifact@v3
  with:
    path: 'dist/'

- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
```

### Key Learning

**Use official GitHub Actions for GitHub services** whenever available instead of third-party npm packages. They provide better integration, authentication, and support.

---

## 2. Lock File Synchronization Issues

### Problem

GitHub Actions `npm ci` failed with:
```
npm error `npm ci` can only install packages when your package-lock.json and 
package-lock.json or npm-shrinkwrap.json are in sync.
```

This occurred in both:
- Root `package-lock.json` (frontend)
- `backend/package-lock.json` (backend)

### Root Cause

When `package.json` dependencies are updated without running `npm install`, the lock file becomes out of sync. GitHub Actions uses `npm ci` which requires exact synchronization between `package.json` and lock files.

**Why this happened**:
- Developers updated `package.json` but didn't commit updated `package-lock.json`
- Wrangler and other dependencies have nested dependencies that must be locked

### Solution

**Run `npm install` locally and commit lock files**:

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..

# Commit both
git add package-lock.json backend/package-lock.json
git commit -m "chore: sync lock files"
git push origin main
```

### Best Practices

1. **Always commit lock files** to version control
2. **Never manually edit** lock files
3. **Run `npm install`** whenever `package.json` changes
4. **Use `npm ci`** in CI/CD (exact versions from lock file)
5. **Use `npm install`** locally (may update lock file)

### Code Pattern

Good workflow:
```bash
# Update dependency
npm install new-package

# Automatically updates package.json and package-lock.json
git add package.json package-lock.json
git commit -m "chore: add new-package"
```

### Key Learning

**Lock files are critical for CI/CD reproducibility**. Always synchronize them with `package.json` before pushing, especially in multi-workspace projects.

---

## 3. Wrangler Node.js Version Requirement

### Problem

GitHub Actions backend deployment failed:
```
Wrangler requires at least Node.js v22.0.0. You are using v20.20.2.
```

### Root Cause

Wrangler v4.86.0 requires Node.js v22+, but the deployment workflow was configured to use Node.js v20 for the backend job.

The frontend job was already using v22 (for Vite), but the backend job had a different configuration.

### Solution

**Updated backend Node.js version in `.github/workflows/deploy.yml`**:

```yaml
backend-deploy:
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v5
      with:
        node-version: '22'  # Changed from '20' to '22'
        cache: 'npm'
```

### Consideration

**Why v22 for both frontend and backend?**
- Frontend (Vite): v20+ officially supported, but v22 works fine
- Backend (Wrangler v4): v22 required
- **Unified version**: Use v22 across the entire project for simplicity and consistency

### Version Management

Recommended approach:
1. Check minimum versions for all tools
2. Use the highest required version across the project
3. Specify versions in `.github/workflows/` explicitly
4. Document version requirements in `package.json` (optional)

### Code Pattern

Good practice:
```json
{
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### Key Learning

**Keep Node.js versions consistent across all jobs** in CI/CD workflows. Use the highest required version to avoid compatibility issues and simplify maintenance.

---

## 4. ESLint v10 Flat Config Migration

### Problem

ESLint v10 requires flat config format (`eslint.config.js`), not the legacy `.eslintrc` formats.

### Solution

**Created ESLint flat config**:

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  prettierConfig
];
```

### Key Learning

**Stay updated with major tool versions**. ESLint v10 is a breaking change but provides better performance and configuration flexibility.

---

## 5. Pre-commit Hooks with Husky

### Problem

Initial Husky setup created unexpected directory structure on Windows with reparse points.

### Solution

**Proper Husky + lint-staged setup**:

```bash
# Install
npm install husky lint-staged --save-dev

# Enable
npx husky install

# Configure lint-staged in package.json
"lint-staged": {
  "*.js": ["eslint --fix", "prettier --write"],
  "*.css": ["stylelint --fix", "prettier --write"]
}
```

### Benefits

- ✅ Prevents commits with linting errors
- ✅ Automatic code formatting before commits
- ✅ Reduces CI failures from style issues
- ✅ Enforces code quality standards

### Key Learning

**Git hooks + linting tools** catch issues early before they reach CI/CD, improving developer experience and code quality.

---

## 6. Environment Variable Injection at Build Time

### Problem

Frontend API URL must be embedded at build time, not runtime. This is easy to overlook when switching environments.

### Pattern

```javascript
// vite.config.js - Build time injection
define: {
  'import.meta.env.VITE_API_URL': JSON.stringify(
    process.env.VITE_API_URL || 'http://localhost:8787'
  )
}
```

### Usage

```bash
# Build with production API
VITE_API_URL='https://api.production.com' npm run build

# Build with local API
npm run build  # Uses default http://localhost:8787
```

### Key Learning

**Understand when environment variables are resolved** - build time vs. runtime. This is critical for frontend applications and prevents deployment surprises.

---

## 7. Cloudflare Workers vs Local Development

### Problem

Local `npm run dev` may not fully replicate Cloudflare Workers runtime environment.

### Best Practices

1. **Test locally first**: Use Miniflare (bundled with Wrangler)
   ```bash
   npm run dev
   ```

2. **Deploy to staging/production early**: Test in actual Cloudflare environment
   ```bash
   npm run deploy -- --env production
   ```

3. **Check logs in production**:
   ```bash
   npx wrangler tail production
   ```

### Key Learning

**Worker behavior may differ locally vs. production**. Always test in production environment before considering deployment complete.

---

## 8. CI/CD Workflow Structure

### Pattern

```
every push → CI (lint, test, build)
             ↓
main branch → Deploy Frontend → Deploy Backend
```

Benefits:
- ✅ Code quality checked before deployment
- ✅ Frontend deploys first (backward compatible)
- ✅ Backend deploys after frontend confirmed working
- ✅ Sequential deployment prevents race conditions

### Key Learning

**Separate CI/CD workflows** for different concerns (testing vs. deployment). Order matters - deploy frontend first, then backend.

---

## Summary of Key Takeaways

| Issue | Solution | Category |
|-------|----------|----------|
| GitHub Pages auth failure | Use official GitHub Actions | DevOps |
| Lock file mismatch | Always sync with `npm install` | Package Management |
| Wrangler Node.js requirement | Use v22+ unified version | Infrastructure |
| ESLint v10 breaking change | Migrate to flat config | Tooling |
| Pre-commit setup issues | Use Husky + lint-staged | Code Quality |
| Build-time variable injection | Use Vite `define` option | Configuration |
| Local vs. production differences | Test in both environments | Deployment |
| CI/CD workflow order | Separate concerns, sequential steps | Automation |

---

## Future Improvements

- [ ] Add E2E tests for frontend
- [ ] Add integration tests for backend + frontend
- [ ] Set up performance monitoring for production
- [ ] Implement automated rollback on deployment failure
- [ ] Add security scanning (SAST/DAST)
- [ ] Document secrets rotation process
- [ ] Set up staging environment deployment
