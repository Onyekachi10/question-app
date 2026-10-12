# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.18.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

WORKDIR /usr/src/app

################################################################################
# Create a stage for installing production dependencies.
FROM base as deps

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps as build

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

################################################################################
# Final stage — Next.js frontend only.
FROM base as final

ENV NODE_ENV production

USER node

COPY --chown=node:node package.json next.config.ts ./

COPY --from=deps --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/.next ./.next
COPY --from=build --chown=node:node /usr/src/app/public ./public
COPY --from=build --chown=node:node /usr/src/app/app ./app

# Next.js frontend
EXPOSE 3001

CMD ["npm", "run", "start"]