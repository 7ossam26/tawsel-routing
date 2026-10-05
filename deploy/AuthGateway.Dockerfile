ARG NGINX_IMAGE
FROM ${NGINX_IMAGE}
COPY deploy/auth-gateway.conf /etc/nginx/conf.d/default.conf
RUN nginx -t
EXPOSE 8080
