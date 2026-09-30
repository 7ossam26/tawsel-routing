ARG VROOM_BASE_IMAGE
FROM ${VROOM_BASE_IMAGE}
COPY vroom-conf/config.yml /conf/config.yml
