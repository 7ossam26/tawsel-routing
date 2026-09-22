# Tawsel public client foundation 0.1.0

Designed protocol types, **no callable business HTTP methods**. Generated `src/schema.d.ts` uses only the canonical OpenAPI/JSON Schemas; it imports no Tawsel domain or database modules. It is portable TypeScript and is not a required implementation language for an ERP connector.

From the repository root run `npm run contracts:generate`, then `npm run typecheck -w @tawsel/api-client`. `examples/consumer.ts` demonstrates a consumer importing only public types. TypeScript does not validate quantities, formats, conditional schemas or authorization at runtime; the contract suite uses Ajv 2020-12. Feature phases add real operations and regenerate before release. External HTTP/database conformance is P26–27.

Phase 03's [UI action mapping](../../docs/ui-actions.md) links these designed operations to browser/native-ERP surfaces and implementation owners. It introduces no wire fields, payload schemas, client methods or new permissions. Browser route proposals are not API URLs; the existing example and generated types remain unchanged. Run `python -X utf8 scripts/check-ui-spec.py check` from the repository root for this separate document coverage check, not consumer interoperability.
