# Etapa 1: Construcción de la aplicación
FROM node:18 AS builder

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de la app
COPY package*.json ./
RUN npm install
COPY . .

# Construir la app
RUN npm run build

# Etapa 2: Servir la app con Nginx
FROM nginx:stable-alpine

# Copiar archivos construidos al directorio público de Nginx
COPY --from=builder /app/dist/dapp /usr/share/nginx/html

# Copiar archivo de configuración Nginx personalizado si es necesario
# COPY nginx.conf /etc/nginx/nginx.conf

# Exponer el puerto
EXPOSE 4200

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
