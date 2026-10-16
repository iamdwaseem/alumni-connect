FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --omit=dev
COPY backend/src backend/src
WORKDIR /app/backend
USER node
EXPOSE 5000
CMD ["node","src/server.js"]
