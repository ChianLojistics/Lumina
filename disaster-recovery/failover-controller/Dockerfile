FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm install -g typescript
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
