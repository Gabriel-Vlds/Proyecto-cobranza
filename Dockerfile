# ================================
# ETAPA 1: Build
# ================================
FROM node:18-alpine AS build

WORKDIR /app

COPY index.html .
COPY styles.css .
COPY app.js .

RUN mkdir -p /dist && \
    cp index.html /dist/ && \
    cp styles.css /dist/ && \
    cp app.js /dist/

# ================================
# ETAPA 2: Producción con nginx
# ================================
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
