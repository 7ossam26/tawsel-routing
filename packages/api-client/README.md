# Tawsel public client foundation 0.1.0

Designed protocol types, **no callable business HTTP methods**. Generated `src/schema.d.ts` uses only the canonical OpenAPI/JSON Schemas; it imports no Tawsel domain or database modules. It is portable TypeScript and is not a required implementation language for an ERP connector.

From the repository root run `npm run contracts:generate`, then `npm run typecheck -w @tawsel/api-client`. `examples/consumer.ts` demonstrates a consumer importing only public types. TypeScript does not validate quantities, formats, conditional schemas or authorization at runtime; the contract suite uses Ajv 2020-12. Feature phases add real operations and regenerate before release. External HTTP/database conformance is P26–27.
