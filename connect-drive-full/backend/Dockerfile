FROM node:20
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm rebuild bcrypt --build-from-source
CMD ["npm", "run", "start:dev"]
