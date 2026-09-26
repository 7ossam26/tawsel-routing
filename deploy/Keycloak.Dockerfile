ARG KEYCLOAK_IMAGE
ARG JDK_IMAGE
ARG APP_IMAGE
FROM ${APP_IMAGE} AS theme
COPY identity /app/identity
ARG APP_ORIGIN
RUN node --import tsx scripts/deployment-identity.ts theme "$APP_ORIGIN" /tmp/tawsel-theme
FROM ${KEYCLOAK_IMAGE} AS distribution
FROM ${JDK_IMAGE} AS provider
WORKDIR /build
COPY --from=distribution /opt/keycloak/lib/lib/main /keycloak-libs
COPY identity/provider /provider
RUN mkdir -p classes/META-INF/services && javac --release 21 -encoding UTF-8 -cp '/keycloak-libs/*' -d classes /provider/src/com/tawsel/VerifiedEmailRecovery.java && cp /provider/resources/META-INF/services/* classes/META-INF/services/ && jar --create --file tawsel-recovery.jar -C classes .
FROM distribution AS optimized
COPY --from=provider --chown=keycloak:keycloak /build/tawsel-recovery.jar /opt/keycloak/providers/tawsel-recovery.jar
COPY --from=theme --chown=keycloak:keycloak /tmp/tawsel-theme /opt/keycloak/themes/tawsel
ENV KC_DB=postgres KC_HEALTH_ENABLED=true
RUN touch -m --date=@1750000000 /opt/keycloak/providers/tawsel-recovery.jar && /opt/keycloak/bin/kc.sh build
FROM distribution
COPY --from=optimized /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
