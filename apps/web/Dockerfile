# Frontend GOM NẮNG. Build từ THƯ MỤC GỐC repo, vì cần cả packages/domain và package-lock.json:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 -t gomnang-web .
#
# NEXT_PUBLIC_API_URL được chép thẳng vào code lúc build: đổi địa chỉ backend thì phải build lại image.

FROM node:22.18-alpine AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace gomnang-web

COPY packages/domain packages/domain
COPY apps/web apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# BUILD_STANDALONE bật chế độ gom server tối thiểu (xem next.config.mjs) — chỉ cần cho Docker.
RUN BUILD_STANDALONE=1 npm run build --workspace gomnang-web


# Image chạy thật: chỉ chứa server Next đã gom, không có mã nguồn hay thư viện dùng lúc build.
FROM node:22.18-alpine

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
