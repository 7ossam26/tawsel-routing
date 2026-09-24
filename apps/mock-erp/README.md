# External reference mock ERP receiver

Version 0.1.0, Phase 26. This is explicitly a mock/reference consumer. It has independent PostgreSQL migrations, credentials, inbox, projection history and worker. It imports the published `@tawsel/api-client` package and uses HTTP; it has no dependency on Tawsel domain modules, shared internals or tables. Native source operations/screens are Phase 27.

See [consumer quickstart](../../docs/erp/consumer-quickstart.md) for exact build/install/configuration/start/conformance commands and [integration evidence](../../docs/verification/integration.md) for real failure evidence and limitations.
