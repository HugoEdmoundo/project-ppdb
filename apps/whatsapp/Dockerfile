# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies (including devDeps for TypeScript compilation)
COPY package.json ./
# FIX: npm tidak mengenal --frozen-lockfile (itu flag pnpm).
# Pakai --ci untuk npm agar lockfile-exact dan tidak modifikasi package-lock.json.
COPY package-lock.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune devDependencies
RUN npm prune --production

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Install Chromium + dependencies untuk Puppeteer/whatsapp-web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    libxshmfence1 \
    fonts-noto \
    fonts-noto-color-emoji \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user untuk keamanan
RUN groupadd --system ppuser && useradd --system --gid ppuser ppuser

WORKDIR /app

# Copy compiled output + production node_modules
COPY --from=builder --chown=ppuser:ppuser /app/dist ./dist
COPY --from=builder --chown=ppuser:ppuser /app/node_modules ./node_modules
COPY --chown=ppuser:ppuser package.json ./

# Buat direktori yang dibutuhkan
RUN mkdir -p /app/wa-session /app/logs && chown -R ppuser:ppuser /app

USER ppuser

# Set Chromium path untuk Puppeteer
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
