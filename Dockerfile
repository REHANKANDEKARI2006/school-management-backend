FROM node:20-slim

# Install Chromium and the system-level libraries required to run it headlessly
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system-installed Chromium instead of trying to download one
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json ./

# Install dependencies (skipping devDeps and ignoring peer conflicts)
RUN npm ci --omit=dev --legacy-peer-deps

# Copy application source code
COPY . .

# Expose port (Render automatically forwards traffic to this port)
EXPOSE 5000

# Run backend application
CMD ["node", "src/index.js"]
