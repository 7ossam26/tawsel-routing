ARG NOMINATIM_BASE_IMAGE
FROM ${NOMINATIM_BASE_IMAGE}
# The upstream scripts use bash -x and would print the configured database
# password during startup/import. Preserve behavior without shell tracing.
RUN sed -i '1s/bash -ex/bash -e/' /app/start.sh /app/init.sh
COPY --chmod=0755 deploy/nominatim-start.sh /app/tawsel-start.sh
CMD ["/app/tawsel-start.sh"]
