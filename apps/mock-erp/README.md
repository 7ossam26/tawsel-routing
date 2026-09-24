# Private reference mock ERP source and receiver

Version 0.1.0, Phase 27. This is explicitly a mock/reference consumer. It has independent PostgreSQL migrations, credentials, inbox, projection history and worker. It imports the published `@tawsel/api-client` package and uses HTTP; it has no dependency on Tawsel domain modules, shared internals or tables. Its source records and outgoing immutable commands commit atomically; separate workers send commands and apply signed events. Native Arabic RTL forms use a separate OIDC staff session and are explicitly private/test-only.

See [source protocol](../../docs/erp/source-protocol.md) and [Phase 27 evidence](../../docs/phase-27-evidence.md).

See [consumer quickstart](../../docs/erp/consumer-quickstart.md) for exact build/install/configuration/start/conformance commands and [integration evidence](../../docs/verification/integration.md) for real failure evidence and limitations.
