# Supply registry-verified tag@sha256 references; no mutable default base.
ARG NODE_IMAGE
ARG NGINX_IMAGE
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mock-erp/package.json apps/mock-erp/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN npm ci --no-audit --no-fund
COPY . .
ARG APP_ORIGIN
ENV VITE_TAWSEL_API_BASE_URL=${APP_ORIGIN}
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
# Workers use the pinned tsx runtime and source modules. Preserve their relative
# migration/schema paths; exclude local secrets through the build allowlist.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/apps ./apps
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/contracts ./contracts
COPY --from=build --chown=node:node /app/db ./db
COPY --from=build --chown=node:node /app/scripts ./scripts
ENV NODE_ENV=production
USER node
CMD ["node", "--env-file=/run/secrets/runtime.env", "apps/api/dist/main.js"]

FROM ${NGINX_IMAGE} AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
