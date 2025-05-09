# Etapa 1: Construcción
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --configuration=production

# Etapa 2: Servir con Nginx
FROM nginx:stable-alpine

# Elimina el archivo por defecto de Nginx que muestra la página "Welcome"
RUN rm -rf /usr/share/nginx/html/*

# Copia la app Angular construida
COPY --from=builder /app/dist/dapp /usr/share/nginx/html

# Exponer el puerto 80 (no 4200, Nginx sirve en 80)
EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]
