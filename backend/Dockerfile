# Backend GOM NẮNG. Build từ THƯ MỤC GỐC repo, vì cần cả shared và package-lock.json:
#   docker build -f backend/Dockerfile -t gomnang-api .
#
# Không có bước biên dịch: Node 22.18+ chạy thẳng file .ts bằng cách xoá phần khai báo kiểu.

FROM node:22.18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Cài thư viện trước khi chép code: sửa code không làm mất cache của bước cài đặt.
# Phải chép package.json của mọi workspace thì npm ci mới khớp được với package-lock.json.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace gomnang-backend && npm cache clean --force

COPY shared shared
COPY backend backend

# Thư mục dữ liệu cho PGlite khi không dùng DATABASE_URL. Tạo sẵn với chủ là user "node",
# để volume gắn vào đây ghi được mà không phải chạy container bằng root.
RUN mkdir -p /data && chown node:node /data
ENV DATA_DIR=/data/pglite

USER node
WORKDIR /app/backend
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1

CMD ["node", "src/server.ts"]
