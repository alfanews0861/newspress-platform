# Multi-stage production container for Google Cloud Run
FROM node:20-bookworm-slim

# Install production Linux FFmpeg and system fonts for subtitle / watermark rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source files
COPY . .

# Cloud Run default port
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]
