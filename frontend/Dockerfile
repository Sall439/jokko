# ---------- Étape 1 : build de l'application React ----------
FROM node:20-alpine AS build
WORKDIR /app

# Les variables VITE_* sont injectées au moment du build.
ARG VITE_API_URL=/api
ARG VITE_USE_MOCK=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY . .
RUN npm run build

# ---------- Étape 2 : service des fichiers statiques avec nginx ----------
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
