# Phytospectra web frontend (Next.js standalone) on Cloud Run.
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so
# they must arrive as build args (declared before `npm run build`), not as
# runtime container env. Pass them in the cloudbuild yaml or with
# `docker build --build-arg`.
FROM node:22-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_USE_MOCKS
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_USE_MOCKS=$NEXT_PUBLIC_USE_MOCKS \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
