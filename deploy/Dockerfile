# syntax=docker/dockerfile:1
# Ein Image für alle Umgebungen:
#   target "base"       Devcontainer und Codespaces (Node, pnpm, Claude Code, vorgewärmter pnpm-Store)
#   target "workspace"  Workshop-Server (base plus code-server, klont das Repo beim Start)
# Build-Kontext ist die Repo-Wurzel: docker build -f deploy/Dockerfile --target workspace .
# Das Repo selbst wird nicht ins Image gebacken, nur die Lockfile für den Store.

FROM node:22.11.0-bookworm AS base
ARG PNPM_VERSION=9.12.3
ARG CLAUDE_CODE_VERSION=2.1.285
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_HOME=/usr/local/share/corepack \
    npm_config_store_dir=/opt/pnpm-store
# Corepack aus Node 22.11.0 kennt die aktuellen npm-Signaturschlüssel nicht, daher erst aktualisieren.
RUN npm install -g corepack@0.36.0 \
 && corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate \
 && chmod -R a+rX "$COREPACK_HOME" \
 && npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
 && npm cache clean --force \
 && mkdir -p /opt/pnpm-store && chown node:node /opt/pnpm-store
USER node
WORKDIR /tmp/prewarm
COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch && cd / && rm -rf /tmp/prewarm
WORKDIR /home/node

FROM base AS workspace
ARG CODE_SERVER_VERSION=4.139.1
ARG TARGETARCH
USER root
RUN curl -fsSL -o /tmp/code-server.deb \
      "https://github.com/coder/code-server/releases/download/v${CODE_SERVER_VERSION}/code-server_${CODE_SERVER_VERSION}_${TARGETARCH}.deb" \
 && apt-get install -y --no-install-recommends /tmp/code-server.deb \
 && rm /tmp/code-server.deb && rm -rf /var/lib/apt/lists/*
COPY deploy/workspace-entrypoint.sh /usr/local/bin/workspace-entrypoint
USER node
# 8080 code-server, 5173 UI-Dev-Server, 4000 Mock-Server
EXPOSE 8080 5173 4000
ENTRYPOINT ["workspace-entrypoint"]
