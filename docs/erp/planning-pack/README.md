# ERP planning reference attachments

This directory supplies a readable planning reference for the separate ERP project. Current D-113 scope supports only car/motorcycle; dated evidence remains historical. These attachments are not an installable ERP runtime or production-readiness certificate. Use [the current ERP index](../README.md) and `npm run erp:package` for the complete executable consumer handoff.

Read `00-START-ERP-PLANNING-PROMPT.md`, then 01–03 and 07 before using the detailed canonical references in 04–06. Review the curated business prose against the current source before regenerating. `node scripts/build-erp-planning-pack.mjs` extracts 04–06, hashes source/artifact bytes and produces `planning-manifest.json` and `TAWSEL-ERP-PLANNING-PACK.zip`; it does not review prose or certify runtime checks. [Refresh instructions](REFRESH-BEFORE-SENDING.md) retain the required semantic review.

For a package tied to the final pushed source commit, regenerate in the separate artifact checkout at that exact SHA and inspect the manifest's source commit, working-tree changes and file hashes. Preserve the current original blocks exactly and do not send an older ZIP after changing the canonical two-mode contracts.
