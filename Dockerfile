FROM node:20-alpine
WORKDIR /app
COPY weponare/package.json .
RUN npm install --production
COPY weponare/ .
EXPOSE 3000
CMD ["node", "server.js"]
