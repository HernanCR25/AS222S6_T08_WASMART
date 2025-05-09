# Etapa 1: Construcción de la app Angular
FROM node:18 AS builder

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de la app
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Construir la app
RUN npm run build --prod

# Etapa 2: Servir la app con Nginx
FROM nginx:stable-alpine

# Copiar archivos construidos desde la etapa de construcción
COPY --from=builder /app/dist/dapp /usr/share/nginx/html

# Opcional: Si tienes un archivo de configuración Nginx personalizado, lo puedes copiar aquí
# COPY nginx.conf /etc/nginx/nginx.conf

# Exponer el puerto 80 (el predeterminado para Nginx)
EXPOSE 80

# Comando para ejecutar Nginx
CMD ["nginx", "-g", "daemon off;"]
