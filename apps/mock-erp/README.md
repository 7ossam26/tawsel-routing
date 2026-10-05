# Private reference mock ERP source and receiver

Version 0.1.0, Phase 27. This is explicitly a mock/reference consumer. It has independent PostgreSQL migrations, credentials, inbox, projection history and worker. It imports the published `@tawsel/api-client` package and uses HTTP; it has no dependency on Tawsel domain modules, shared internals or tables. Its source records and outgoing immutable commands commit atomically; separate workers send commands and apply signed events. Native Arabic RTL forms use a separate OIDC staff session. The local loopback mode remains private; the reviewed `public-test` mode is restricted to allowlisted team subjects behind HTTPS and is described in [the Dokploy pilot procedure](../../docs/dokploy-pilot.md).

See [source protocol](../../docs/erp/source-protocol.md) and [Phase 27 evidence](../../docs/phase-27-evidence.md).

See [consumer quickstart](../../docs/erp/consumer-quickstart.md) for exact build/install/configuration/start/conformance commands and [integration evidence](../../docs/verification/integration.md) for real failure evidence and limitations.

For the motorcycle pilot, a new driver reference defaults to motorcycle; the form also offers car and preserves a saved supported choice. A new shipment accepts its written address first. After explicit received assignment, its driver confirms the delivery point in Tawsel before planning; manual map/coordinate confirmation works when private address search is unavailable. Staff can also explicitly submit reviewed coordinates with optional written address. The [pilot walkthrough](../../docs/verification/pilot-walkthrough.md) separates preparation, receipt, point confirmation, execution and ERP application.

Managed deployment runs `scripts/deployment-mock.ts migrate` once, then separate server, `source-worker` and `worker` processes, each with the protected Mock configuration and its own database. Public-test readiness validates its HTTPS/allowlist/proxy configuration and probes the local container listener; a healthy process alone does not establish a completed driver journey.
