FROM node:22.21.1-alpine

WORKDIR /app

ENV NODE_ENV=development

RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
