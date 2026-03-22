FROM node:20-alpine

WORKDIR /app

# Instala dependencias
COPY package.json package-lock.json* ./
RUN npm ci

# Copia el código fuente
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
