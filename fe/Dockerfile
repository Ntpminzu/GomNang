# Frontend GOM NẮNG (gomnang-web). Build từ THƯ MỤC GỐC repo, vì cần cả packages/domain và package-lock.json:
#   docker build -f fe/Dockerfile --build-arg API_ORIGIN=http://backend:4000 -t gomnang-web .
#
# Trình duyệt chỉ gọi /api/* cùng địa chỉ với web; Next.js chuyển tiếp sang API_ORIGIN (rewrite trong next.config.mjs).
# API_ORIGIN và NEXT_PUBLIC_API_MODE được chốt LÚC BUILD: đổi địa chỉ backend thì phải build lại image.

FROM node:22.18-alpine AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY be/package.json be/
COPY fe/package.json fe/
RUN npm ci --workspace gomnang-web

COPY packages/domain packages/domain
COPY fe fe

ARG API_ORIGIN=http://localhost:4000
ARG NEXT_PUBLIC_API_MODE=http
ENV API_ORIGIN=$API_ORIGIN NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE
# Bỏ cache của lần build: không cần để chạy, chỉ làm image nặng thêm.
RUN npm run build --workspace gomnang-web && rm -rf fe/.next/cache


# Image chạy thật: chỉ thư viện production và kết quả build, không có mã nguồn hay công cụ build.
# next.config.mjs không bật output "standalone", nên chạy `next start` với node_modules đầy đủ.
FROM node:22.18-alpine

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY be/package.json be/
COPY fe/package.json fe/
# Trình biên dịch SWC (~180 MB, cả bản glibc lẫn musl) chỉ dùng lúc build, `next start` không cần.
RUN npm ci --omit=dev --workspace gomnang-web && npm cache clean --force && rm -rf node_modules/@next/swc-*

COPY packages/domain packages/domain
COPY fe/next.config.mjs fe/
COPY --from=build --chown=node:node /app/fe/.next fe/.next

USER node
WORKDIR /app/fe
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/" > /dev/null || exit 1

CMD ["node", "../node_modules/next/dist/bin/next", "start"]
