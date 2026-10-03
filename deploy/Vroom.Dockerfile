ARG VROOM_BASE_IMAGE
FROM ${VROOM_BASE_IMAGE}
ENV VROOM_LOG=/tmp
COPY vroom-conf/config.yml /conf/config.yml
COPY vroom-conf/config.yml /vroom-express/config.yml
# The upstream entrypoint copies config at startup, which fails read_only.
ENTRYPOINT ["node"]
CMD ["src/index.js"]
