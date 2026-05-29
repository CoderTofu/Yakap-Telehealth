FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY tsconfig.json tsconfig.json
COPY backend backend
COPY packages/shared packages/shared

RUN npm run build --workspace=backend

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=backend"]
