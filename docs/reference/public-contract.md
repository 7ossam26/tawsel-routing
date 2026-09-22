# Tawsel public contract reference — designed

Generated from canonical OpenAPI 3.1.1 / JSON Schema 2020-12 by `npm run contracts:generate`.

**No business HTTP operation is implemented or released.** The foundation exports shared types only; there are no callable paths, server URL, credentials or working business examples. Workspace `/health` is excluded.

[State model](../tracking-and-consistency.md) · [Operation ownership](../contract-coverage.md) · [UI action mapping (designed)](../ui-actions.md) · [Integration guide](../integration-guide.md) · [Canonical OpenAPI](../../contracts/openapi.yaml)

Envelope payload objects are deliberately extensible at this stage. Feature owners must add exact versioned payload schemas and cross-field/domain checks before handlers. A valid envelope is not an accepted command. TypeScript types cannot enforce numeric bounds, formats or all conditional rules.

## Common schemas and envelopes

### Uuid

[Canonical definition](../../contracts/common.schema.json#/$defs/Uuid)

Lowercase UUID; field identity and authenticated relationship checks remain distinct.

```json
{
  "type": "string",
  "format": "uuid",
  "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  "description": "Lowercase UUID; field identity and authenticated relationship checks remain distinct."
}
```

### SchemaVersion

[Canonical definition](../../contracts/common.schema.json#/$defs/SchemaVersion)

```json
{
  "type": "string",
  "pattern": "^[1-9][0-9]*\\.[0-9]+\\.[0-9]+$"
}
```

### Revision

[Canonical definition](../../contracts/common.schema.json#/$defs/Revision)

```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 9007199254740991
}
```

### Generation

[Canonical definition](../../contracts/common.schema.json#/$defs/Generation)

```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 9007199254740991
}
```

### Sequence

[Canonical definition](../../contracts/common.schema.json#/$defs/Sequence)

```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 9007199254740991
}
```

### PieceCount

[Canonical definition](../../contracts/common.schema.json#/$defs/PieceCount)

```json
{
  "type": "integer",
  "minimum": 0,
  "maximum": 9007199254740991
}
```

### PositivePieceCount

[Canonical definition](../../contracts/common.schema.json#/$defs/PositivePieceCount)

```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 9007199254740991
}
```

### UtcInstant

[Canonical definition](../../contracts/common.schema.json#/$defs/UtcInstant)

UTC RFC 3339 instant. Does not establish clock accuracy.

```json
{
  "type": "string",
  "format": "date-time",
  "pattern": "Z$",
  "description": "UTC RFC 3339 instant. Does not establish clock accuracy."
}
```

### ExternalId

[Canonical definition](../../contracts/common.schema.json#/$defs/ExternalId)

```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 256
}
```

### OperationId

[Canonical definition](../../contracts/common.schema.json#/$defs/OperationId)

```json
{
  "type": "string",
  "pattern": "^[a-z][a-zA-Z0-9]*(\\.[a-z][a-zA-Z0-9]*)+$",
  "maxLength": 128
}
```

### SourceReference

[Canonical definition](../../contracts/common.schema.json#/$defs/SourceReference)

```json
{
  "type": "object",
  "properties": {
    "tenantId": {
      "$ref": "#/$defs/Uuid"
    },
    "integrationId": {
      "$ref": "#/$defs/Uuid"
    },
    "externalId": {
      "$ref": "#/$defs/ExternalId"
    }
  },
  "required": [
    "tenantId",
    "integrationId",
    "externalId"
  ],
  "additionalProperties": false
}
```

### Money

[Canonical definition](../../contracts/common.schema.json#/$defs/Money)

Nonnegative integer minor units, never a decimal amount or arbitrary underpayment. Currency/exponent must match supported source policy; EGP is exponent 2.

```json
{
  "type": "object",
  "properties": {
    "amountMinor": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "currency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$"
    },
    "exponent": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4
    }
  },
  "required": [
    "amountMinor",
    "currency",
    "exponent"
  ],
  "additionalProperties": false,
  "description": "Nonnegative integer minor units, never a decimal amount or arbitrary underpayment. Currency/exponent must match supported source policy; EGP is exponent 2.",
  "allOf": [
    {
      "if": {
        "properties": {
          "currency": {
            "const": "EGP"
          }
        },
        "required": [
          "currency"
        ]
      },
      "then": {
        "properties": {
          "exponent": {
            "const": 2
          }
        }
      }
    }
  ]
}
```

### Coordinates

[Canonical definition](../../contracts/common.schema.json#/$defs/Coordinates)

```json
{
  "type": "object",
  "properties": {
    "latitude": {
      "type": "number",
      "minimum": -90,
      "maximum": 90
    },
    "longitude": {
      "type": "number",
      "minimum": -180,
      "maximum": 180
    }
  },
  "required": [
    "latitude",
    "longitude"
  ],
  "additionalProperties": false
}
```

### ContactSnapshot

[Canonical definition](../../contracts/common.schema.json#/$defs/ContactSnapshot)

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "phone": {
      "type": "string",
      "minLength": 3,
      "maxLength": 32
    },
    "externalCustomerReference": {
      "$ref": "#/$defs/SourceReference"
    }
  },
  "required": [
    "name",
    "phone"
  ],
  "additionalProperties": false
}
```

### LocationSnapshot

[Canonical definition](../../contracts/common.schema.json#/$defs/LocationSnapshot)

```json
{
  "type": "object",
  "anyOf": [
    {
      "properties": {
        "originalAddress": true
      },
      "required": [
        "originalAddress"
      ]
    },
    {
      "properties": {
        "confirmedPin": true
      },
      "required": [
        "confirmedPin"
      ]
    }
  ],
  "properties": {
    "originalAddress": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2000
    },
    "confirmedPin": {
      "$ref": "#/$defs/Coordinates"
    },
    "locationRevision": {
      "$ref": "#/$defs/Revision"
    },
    "provenance": {
      "type": "string",
      "enum": [
        "source",
        "driver-confirmed",
        "staff-confirmed"
      ]
    }
  },
  "required": [
    "provenance"
  ],
  "additionalProperties": false
}
```

### TimeWindow

[Canonical definition](../../contracts/common.schema.json#/$defs/TimeWindow)

```json
{
  "type": "object",
  "properties": {
    "earliestAt": {
      "$ref": "#/$defs/UtcInstant"
    },
    "latestAt": {
      "$ref": "#/$defs/UtcInstant"
    }
  },
  "required": [
    "earliestAt"
  ],
  "additionalProperties": false
}
```

### DeliveryRequirements

[Canonical definition](../../contracts/common.schema.json#/$defs/DeliveryRequirements)

```json
{
  "type": "object",
  "properties": {
    "priority": {
      "type": "string",
      "enum": [
        "ordinary",
        "urgent"
      ]
    },
    "serviceDurationSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    },
    "timeWindow": {
      "$ref": "#/$defs/TimeWindow"
    },
    "instructions": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2000
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### DeliverySnapshot

[Canonical definition](../../contracts/common.schema.json#/$defs/DeliverySnapshot)

```json
{
  "type": "object",
  "properties": {
    "sourceTaskReference": {
      "$ref": "#/$defs/SourceReference"
    },
    "sourceOrderReference": {
      "$ref": "#/$defs/SourceReference"
    },
    "sourceRevision": {
      "$ref": "#/$defs/Revision"
    },
    "customer": {
      "$ref": "#/$defs/ContactSnapshot"
    },
    "location": {
      "$ref": "#/$defs/LocationSnapshot"
    },
    "requirements": {
      "$ref": "#/$defs/DeliveryRequirements"
    }
  },
  "required": [
    "sourceTaskReference",
    "sourceRevision",
    "customer",
    "location"
  ],
  "additionalProperties": false
}
```

### ResourceContext

[Canonical definition](../../contracts/common.schema.json#/$defs/ResourceContext)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "$ref": "#/$defs/Uuid"
    },
    "assignmentId": {
      "$ref": "#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "#/$defs/Uuid"
    },
    "tripId": {
      "$ref": "#/$defs/Uuid"
    },
    "planId": {
      "$ref": "#/$defs/Uuid"
    },
    "stopId": {
      "$ref": "#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "#/$defs/Uuid"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### Versions

[Canonical definition](../../contracts/common.schema.json#/$defs/Versions)

```json
{
  "type": "object",
  "properties": {
    "sourceRevision": {
      "$ref": "#/$defs/Revision"
    },
    "resourceRevision": {
      "$ref": "#/$defs/Revision"
    },
    "outcomeRevision": {
      "$ref": "#/$defs/Revision"
    },
    "assignmentGeneration": {
      "$ref": "#/$defs/Generation"
    },
    "routeRevision": {
      "$ref": "#/$defs/Revision"
    },
    "deviceGeneration": {
      "$ref": "#/$defs/Generation"
    },
    "snapshotRevision": {
      "$ref": "#/$defs/Revision"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### ClockEvidence

[Canonical definition](../../contracts/common.schema.json#/$defs/ClockEvidence)

```json
{
  "type": "object",
  "properties": {
    "quality": {
      "type": "string",
      "enum": [
        "known",
        "uncertain",
        "unknown"
      ]
    },
    "estimatedOffsetMilliseconds": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "quality"
  ],
  "additionalProperties": false
}
```

### Observation

[Canonical definition](../../contracts/common.schema.json#/$defs/Observation)

```json
{
  "type": "object",
  "properties": {
    "observedAt": {
      "anyOf": [
        {
          "$ref": "#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "clock": {
      "$ref": "#/$defs/ClockEvidence"
    }
  },
  "required": [
    "observedAt",
    "clock"
  ],
  "additionalProperties": false
}
```

### DeviceContext

[Canonical definition](../../contracts/common.schema.json#/$defs/DeviceContext)

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "const": "device"
    },
    "tenantId": {
      "$ref": "#/$defs/Uuid"
    },
    "accountId": {
      "$ref": "#/$defs/Uuid"
    },
    "deviceId": {
      "$ref": "#/$defs/Uuid"
    },
    "deviceGeneration": {
      "$ref": "#/$defs/Generation"
    },
    "deviceSequence": {
      "$ref": "#/$defs/Sequence"
    }
  },
  "required": [
    "kind",
    "tenantId",
    "accountId",
    "deviceId",
    "deviceGeneration",
    "deviceSequence"
  ],
  "additionalProperties": false
}
```

### IntegrationContext

[Canonical definition](../../contracts/common.schema.json#/$defs/IntegrationContext)

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "const": "integration"
    },
    "tenantId": {
      "$ref": "#/$defs/Uuid"
    },
    "integrationId": {
      "$ref": "#/$defs/Uuid"
    },
    "assertedActorId": {
      "$ref": "#/$defs/Uuid"
    }
  },
  "required": [
    "kind",
    "tenantId",
    "integrationId"
  ],
  "additionalProperties": false
}
```

### CommandContext

[Canonical definition](../../contracts/common.schema.json#/$defs/CommandContext)

Body assertions must match authenticated bindings. An asserted actorId is not authentication.

```json
{
  "oneOf": [
    {
      "$ref": "#/$defs/DeviceContext"
    },
    {
      "$ref": "#/$defs/IntegrationContext"
    }
  ],
  "description": "Body assertions must match authenticated bindings. An asserted actorId is not authentication."
}
```

### EvidenceStatus

[Canonical definition](../../contracts/common.schema.json#/$defs/EvidenceStatus)

```json
{
  "type": "string",
  "enum": [
    "received"
  ]
}
```

### BusinessStatus

[Canonical definition](../../contracts/common.schema.json#/$defs/BusinessStatus)

```json
{
  "type": "string",
  "enum": [
    "pending",
    "accepted",
    "rejected",
    "review-required"
  ]
}
```

### DeliveryStatus

[Canonical definition](../../contracts/common.schema.json#/$defs/DeliveryStatus)

```json
{
  "type": "string",
  "enum": [
    "pending",
    "sending",
    "received",
    "failed"
  ]
}
```

### ApplicationStatus

[Canonical definition](../../contracts/common.schema.json#/$defs/ApplicationStatus)

```json
{
  "type": "string",
  "enum": [
    "unknown",
    "pending",
    "applied",
    "failed"
  ]
}
```

### ErrorCode

[Canonical definition](../../contracts/common.schema.json#/$defs/ErrorCode)

```json
{
  "type": "string",
  "enum": [
    "validation_failed",
    "idempotency_conflict",
    "capacity_exceeded",
    "invalid_pin",
    "unauthorized",
    "forbidden_resource",
    "departed_edit_forbidden",
    "stale_revision",
    "stale_device",
    "unsupported_price_allocation",
    "dependency_missing",
    "dependency_unavailable",
    "unassigned_route",
    "result_unknown",
    "unsupported_schema_version",
    "replay_expired",
    "correction_dependency_conflict"
  ]
}
```

### Problem

[Canonical definition](../../contracts/common.schema.json#/$defs/Problem)

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "format": "uri"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "status": {
      "type": "integer",
      "minimum": 400,
      "maximum": 599
    },
    "code": {
      "$ref": "#/$defs/ErrorCode"
    },
    "correlationId": {
      "$ref": "#/$defs/Uuid"
    },
    "actionId": {
      "$ref": "#/$defs/Uuid"
    },
    "detail": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
    "retryable": {
      "type": "boolean"
    }
  },
  "required": [
    "type",
    "title",
    "status",
    "code",
    "correlationId",
    "retryable"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "code": {
            "const": "validation_failed"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 400
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "idempotency_conflict"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "capacity_exceeded"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "invalid_pin"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 422
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "unauthorized"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 401
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "forbidden_resource"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 403
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "departed_edit_forbidden"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "stale_revision"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "stale_device"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "unsupported_price_allocation"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 422
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "dependency_missing"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "dependency_unavailable"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 503
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "unassigned_route"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 422
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "result_unknown"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 503
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "unsupported_schema_version"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 422
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "replay_expired"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 410
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "code": {
            "const": "correction_dependency_conflict"
          }
        },
        "required": [
          "code"
        ]
      },
      "then": {
        "properties": {
          "status": {
            "const": 409
          }
        }
      }
    }
  ]
}
```

### Capability

[Canonical definition](../../contracts/common.schema.json#/$defs/Capability)

```json
{
  "type": "string",
  "enum": [
    "monitor.read",
    "planning.manage",
    "location.review",
    "execution.own",
    "correction.own",
    "reports.read",
    "reports.export",
    "intake.prepare",
    "assignment.manage",
    "return.receive",
    "return.dispose",
    "identity.provision",
    "integration.manage",
    "diagnostics.read"
  ]
}
```

### PageRequest

[Canonical definition](../../contracts/common.schema.json#/$defs/PageRequest)

```json
{
  "type": "object",
  "properties": {
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2048
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### PageInfo

[Canonical definition](../../contracts/common.schema.json#/$defs/PageInfo)

```json
{
  "type": "object",
  "properties": {
    "nextCursor": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048
        },
        {
          "type": "null"
        }
      ]
    },
    "snapshotRevision": {
      "$ref": "#/$defs/Revision"
    }
  },
  "required": [
    "nextCursor",
    "snapshotRevision"
  ],
  "additionalProperties": false
}
```

### ActionEnvelope

[Canonical definition](../../contracts/action-envelope.v1.schema.json)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/action-envelope.v1.schema.json",
  "title": "Action envelope v1 — designed",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "payloadVersion": {
      "const": "1.0.0"
    },
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "operationId": {
      "$ref": "./common.schema.json#/$defs/OperationId"
    },
    "context": {
      "$ref": "./common.schema.json#/$defs/CommandContext"
    },
    "resources": {
      "$ref": "./common.schema.json#/$defs/ResourceContext"
    },
    "baseVersions": {
      "$ref": "./common.schema.json#/$defs/Versions"
    },
    "dependsOnActionIds": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      },
      "uniqueItems": true,
      "maxItems": 100
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "type": "object",
      "description": "Envelope validation only. Feature owner MUST validate the operation-specific versioned payload before any acceptance.",
      "additionalProperties": true
    }
  },
  "required": [
    "schemaVersion",
    "payloadVersion",
    "actionId",
    "operationId",
    "context",
    "resources",
    "baseVersions",
    "dependsOnActionIds",
    "observation",
    "payload"
  ],
  "additionalProperties": false
}
```

### EvidenceReceipt

[Canonical definition](../../contracts/evidence-receipt.v1.schema.json)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/evidence-receipt.v1.schema.json",
  "title": "Durable evidence receipt v1 — designed",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "receiptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "evidenceStatus": {
      "$ref": "./common.schema.json#/$defs/EvidenceStatus"
    },
    "businessStatus": {
      "$ref": "./common.schema.json#/$defs/BusinessStatus"
    },
    "receivedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "committedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "resourceVersions": {
      "$ref": "./common.schema.json#/$defs/Versions"
    },
    "problem": {
      "$ref": "./common.schema.json#/$defs/Problem"
    }
  },
  "required": [
    "schemaVersion",
    "receiptId",
    "actionId",
    "evidenceStatus",
    "businessStatus",
    "receivedAt"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "businessStatus": {
            "const": "accepted"
          }
        },
        "required": [
          "businessStatus"
        ]
      },
      "then": {
        "properties": {
          "committedAt": true,
          "resourceVersions": true
        },
        "required": [
          "committedAt",
          "resourceVersions"
        ],
        "not": {
          "properties": {
            "problem": true
          },
          "required": [
            "problem"
          ]
        }
      },
      "else": {
        "not": {
          "properties": {
            "committedAt": true
          },
          "required": [
            "committedAt"
          ]
        }
      }
    },
    {
      "if": {
        "properties": {
          "businessStatus": {
            "enum": [
              "rejected",
              "review-required"
            ]
          }
        },
        "required": [
          "businessStatus"
        ]
      },
      "then": {
        "properties": {
          "problem": true
        },
        "required": [
          "problem"
        ]
      }
    }
  ]
}
```

### EventEnvelope

[Canonical definition](../../contracts/events/envelope.v1.schema.json)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/events/envelope.v1.schema.json",
  "title": "Recipient event envelope v1 — designed",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "payloadVersion": {
      "const": "1.0.0"
    },
    "eventId": {
      "$ref": "../common.schema.json#/$defs/Uuid"
    },
    "eventType": {
      "$ref": "../common.schema.json#/$defs/OperationId"
    },
    "eventKind": {
      "type": "string",
      "enum": [
        "transition",
        "replacement-snapshot"
      ]
    },
    "tenantId": {
      "$ref": "../common.schema.json#/$defs/Uuid"
    },
    "recipientIntegrationId": {
      "$ref": "../common.schema.json#/$defs/Uuid"
    },
    "aggregate": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "task",
            "assignment",
            "trip",
            "workday",
            "return-request",
            "integration"
          ]
        },
        "id": {
          "$ref": "../common.schema.json#/$defs/Uuid"
        },
        "recipientSequence": {
          "$ref": "../common.schema.json#/$defs/Sequence"
        }
      },
      "required": [
        "type",
        "id",
        "recipientSequence"
      ],
      "additionalProperties": false
    },
    "resources": {
      "$ref": "../common.schema.json#/$defs/ResourceContext"
    },
    "versions": {
      "$ref": "../common.schema.json#/$defs/Versions"
    },
    "correlation": {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "../common.schema.json#/$defs/Uuid"
        },
        "sourceReference": {
          "$ref": "../common.schema.json#/$defs/SourceReference"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "committedAt": {
      "$ref": "../common.schema.json#/$defs/UtcInstant"
    },
    "snapshotRevision": {
      "$ref": "../common.schema.json#/$defs/Revision"
    },
    "payload": {
      "type": "object",
      "additionalProperties": true,
      "description": "Feature owner supplies event-type/payload-version schema. Envelope acceptance is not business validation."
    }
  },
  "required": [
    "schemaVersion",
    "payloadVersion",
    "eventId",
    "eventType",
    "eventKind",
    "tenantId",
    "recipientIntegrationId",
    "aggregate",
    "resources",
    "versions",
    "correlation",
    "committedAt",
    "payload"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "eventKind": {
            "const": "replacement-snapshot"
          }
        },
        "required": [
          "eventKind"
        ]
      },
      "then": {
        "properties": {
          "snapshotRevision": true
        },
        "required": [
          "snapshotRevision"
        ]
      },
      "else": {
        "not": {
          "properties": {
            "snapshotRevision": true
          },
          "required": [
            "snapshotRevision"
          ]
        }
      }
    }
  ]
}
```

## Validated examples

All are designed examples. Invalid cases are rejection fixtures, not requests to a live service.

| Example | Schema | Expected |
| --- | --- | --- |
| common-Uuid | common.schema.json#/$defs/Uuid | valid foundation shape |
| common-SchemaVersion | common.schema.json#/$defs/SchemaVersion | valid foundation shape |
| common-Revision | common.schema.json#/$defs/Revision | valid foundation shape |
| common-Generation | common.schema.json#/$defs/Generation | valid foundation shape |
| common-Sequence | common.schema.json#/$defs/Sequence | valid foundation shape |
| common-PieceCount | common.schema.json#/$defs/PieceCount | valid foundation shape |
| common-PositivePieceCount | common.schema.json#/$defs/PositivePieceCount | valid foundation shape |
| common-UtcInstant | common.schema.json#/$defs/UtcInstant | valid foundation shape |
| common-ExternalId | common.schema.json#/$defs/ExternalId | valid foundation shape |
| common-OperationId | common.schema.json#/$defs/OperationId | valid foundation shape |
| common-SourceReference | common.schema.json#/$defs/SourceReference | valid foundation shape |
| common-Money | common.schema.json#/$defs/Money | valid foundation shape |
| common-Coordinates | common.schema.json#/$defs/Coordinates | valid foundation shape |
| common-ContactSnapshot | common.schema.json#/$defs/ContactSnapshot | valid foundation shape |
| common-LocationSnapshot | common.schema.json#/$defs/LocationSnapshot | valid foundation shape |
| common-TimeWindow | common.schema.json#/$defs/TimeWindow | valid foundation shape |
| common-DeliveryRequirements | common.schema.json#/$defs/DeliveryRequirements | valid foundation shape |
| common-DeliverySnapshot | common.schema.json#/$defs/DeliverySnapshot | valid foundation shape |
| common-ResourceContext | common.schema.json#/$defs/ResourceContext | valid foundation shape |
| common-Versions | common.schema.json#/$defs/Versions | valid foundation shape |
| common-ClockEvidence | common.schema.json#/$defs/ClockEvidence | valid foundation shape |
| common-Observation | common.schema.json#/$defs/Observation | valid foundation shape |
| common-DeviceContext | common.schema.json#/$defs/DeviceContext | valid foundation shape |
| common-IntegrationContext | common.schema.json#/$defs/IntegrationContext | valid foundation shape |
| common-CommandContext | common.schema.json#/$defs/CommandContext | valid foundation shape |
| common-EvidenceStatus | common.schema.json#/$defs/EvidenceStatus | valid foundation shape |
| common-BusinessStatus | common.schema.json#/$defs/BusinessStatus | valid foundation shape |
| common-DeliveryStatus | common.schema.json#/$defs/DeliveryStatus | valid foundation shape |
| common-ApplicationStatus | common.schema.json#/$defs/ApplicationStatus | valid foundation shape |
| common-ErrorCode | common.schema.json#/$defs/ErrorCode | valid foundation shape |
| common-Problem | common.schema.json#/$defs/Problem | valid foundation shape |
| common-Capability | common.schema.json#/$defs/Capability | valid foundation shape |
| common-PageRequest | common.schema.json#/$defs/PageRequest | valid foundation shape |
| common-PageInfo | common.schema.json#/$defs/PageInfo | valid foundation shape |
| action-partial-envelope | action-envelope.v1.schema.json | valid foundation shape |
| action-source-envelope | action-envelope.v1.schema.json | valid foundation shape |
| evidence-pending | evidence-receipt.v1.schema.json | valid foundation shape |
| evidence-accepted | evidence-receipt.v1.schema.json | valid foundation shape |
| evidence-old-device-review | evidence-receipt.v1.schema.json | valid foundation shape |
| event-outcome-transition | events/envelope.v1.schema.json | valid foundation shape |
| event-progress-snapshot | events/envelope.v1.schema.json | valid foundation shape |
| event-return-request | events/envelope.v1.schema.json | valid foundation shape |
| event-correction-transition | events/envelope.v1.schema.json | valid foundation shape |
| error-validation_failed | common.schema.json#/$defs/Problem | valid foundation shape |
| error-idempotency_conflict | common.schema.json#/$defs/Problem | valid foundation shape |
| error-capacity_exceeded | common.schema.json#/$defs/Problem | valid foundation shape |
| error-invalid_pin | common.schema.json#/$defs/Problem | valid foundation shape |
| error-unauthorized | common.schema.json#/$defs/Problem | valid foundation shape |
| error-forbidden_resource | common.schema.json#/$defs/Problem | valid foundation shape |
| error-departed_edit_forbidden | common.schema.json#/$defs/Problem | valid foundation shape |
| error-stale_revision | common.schema.json#/$defs/Problem | valid foundation shape |
| error-stale_device | common.schema.json#/$defs/Problem | valid foundation shape |
| error-unsupported_price_allocation | common.schema.json#/$defs/Problem | valid foundation shape |
| error-dependency_missing | common.schema.json#/$defs/Problem | valid foundation shape |
| error-dependency_unavailable | common.schema.json#/$defs/Problem | valid foundation shape |
| error-unassigned_route | common.schema.json#/$defs/Problem | valid foundation shape |
| error-result_unknown | common.schema.json#/$defs/Problem | valid foundation shape |
| error-unsupported_schema_version | common.schema.json#/$defs/Problem | valid foundation shape |
| error-replay_expired | common.schema.json#/$defs/Problem | valid foundation shape |
| error-correction_dependency_conflict | common.schema.json#/$defs/Problem | valid foundation shape |
| piece--1 | common.schema.json#/$defs/PieceCount | invalid (minimum) |
| piece-1.5 | common.schema.json#/$defs/PieceCount | invalid (type) |
| piece-2 | common.schema.json#/$defs/PieceCount | invalid (type) |
| piece-9007199254740992 | common.schema.json#/$defs/PieceCount | invalid (maximum) |
| positive-piece-zero | common.schema.json#/$defs/PositivePieceCount | invalid (minimum) |
| money-fraction | common.schema.json#/$defs/Money | invalid (type) |
| money-decimal-string | common.schema.json#/$defs/Money | invalid (type) |
| money-negative | common.schema.json#/$defs/Money | invalid (minimum) |
| money-unsafe-integer | common.schema.json#/$defs/Money | invalid (maximum) |
| money-missing-currency | common.schema.json#/$defs/Money | invalid (required) |
| money-invalid-currency | common.schema.json#/$defs/Money | invalid (pattern) |
| money-egp-wrong-exponent | common.schema.json#/$defs/Money | invalid (const) |
| uuid-not-uuid | common.schema.json#/$defs/Uuid | invalid (format) |
| source-missing-scope | common.schema.json#/$defs/SourceReference | invalid (required) |
| revision-zero | common.schema.json#/$defs/Revision | invalid (minimum) |
| time-local-offset | common.schema.json#/$defs/UtcInstant | invalid (pattern) |
| time-invalid-date | common.schema.json#/$defs/UtcInstant | invalid (format) |
| pin-outside-latitude | common.schema.json#/$defs/Coordinates | invalid (maximum) |
| action-future-envelope | action-envelope.v1.schema.json | invalid (const) |
| action-future-payload | action-envelope.v1.schema.json | invalid (const) |
| action-missing-device-generation | action-envelope.v1.schema.json | invalid (required) |
| action-extra-authority | action-envelope.v1.schema.json | invalid (additionalProperties) |
| action-duplicate-dependency | action-envelope.v1.schema.json | invalid (uniqueItems) |
| evidence-received-not-accepted | evidence-receipt.v1.schema.json | invalid (not) |
| evidence-accepted-without-commit | evidence-receipt.v1.schema.json | invalid (required) |
| evidence-not-erp-applied | evidence-receipt.v1.schema.json | invalid (enum) |
| evidence-review-without-problem | evidence-receipt.v1.schema.json | invalid (required) |
| event-unsupported-version | events/envelope.v1.schema.json | invalid (const) |
| event-sequence-zero | events/envelope.v1.schema.json | invalid (minimum) |
| event-missing-recipient | events/envelope.v1.schema.json | invalid (required) |
| event-snapshot-without-revision | events/envelope.v1.schema.json | invalid (required) |
| event-transition-not-snapshot | events/envelope.v1.schema.json | invalid (not) |
| unknown-null-is-not-zero | common.schema.json#/$defs/Money | invalid (type) |
| conflict-must-be-409 | common.schema.json#/$defs/Problem | invalid (const) |
| location-has-no-destination | common.schema.json#/$defs/LocationSnapshot | invalid (anyOf) |

[Canonical example data](../../contracts/examples/README.md)
