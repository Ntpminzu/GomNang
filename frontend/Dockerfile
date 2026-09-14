# Frontend GOM NẮNG. Build từ THƯ MỤC GỐC repo, vì cần cả shared và package-lock.json:
#   docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 -t gomnang-frontend .
#
# NEXT_PUBLIC_API_URL được chép thẳng vào code lúc build: đổi địa chỉ backend thì phải build lại image.

FROM node:22.18-alpine AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace gomnang-frontend

COPY shared shared
COPY frontend frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# BUILD_STANDALONE bật chế độ gom server tối thiểu (xem next.config.mjs) — chỉ cần cho Docker.
RUN BUILD_STANDALONE=1 npm run build --workspace gomnang-frontend


# Image chạy thật: chỉ chứa server Next đã gom, không có mã nguồn hay thư viện dùng lúc build.
FROM node:22.18-alpine

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static

USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
