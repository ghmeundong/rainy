#!/bin/bash
set -e
npm install
if [ -f package-lock.json ]; then
  npm run prepare || true
fi
