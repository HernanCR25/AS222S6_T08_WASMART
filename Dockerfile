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
RUN npm run build --configuration=production

# Etapa 2: Servir la app con Nginx
FROM nginx:stable-alpine

# Remover archivos por defecto de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar archivos construidos desde la etapa de construcción
# LA RUTA CORRECTA: /app/dist/dapp/browser/ (donde están los archivos del cliente)
COPY --from=builder /app/dist/dapp/browser/ /usr/share/nginx/html/

# Configuración de nginx para Angular SPA (manejo de rutas)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Configuración para Single Page Application \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Cache para archivos estáticos \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando para ejecutar Nginx
CMD ["nginx", "-g", "daemon off;"]