# Tawsel public contract reference

Generated from canonical OpenAPI 3.1.1 / JSON Schema 2020-12 by `npm run contracts:generate`.

**P07 browser sessions and P08 ERP provisioning are implemented locally.** See [identity setup and browser quickstart](../identity.md) and [P07 evidence](../phase-07-evidence.md). See [P08 service provisioning](../erp/consumer-quickstart.md). Other domain HTTP operations/events remain designed and unavailable. Workspace `/health` is excluded. No production release or real ERP interoperability is claimed.

[State model](../tracking-and-consistency.md) · [Operation ownership](../contract-coverage.md) · [UI action mapping (designed)](../ui-actions.md) · [Integration guide](../integration-guide.md) · [Canonical OpenAPI](../../contracts/openapi.yaml)

Envelope payload objects are deliberately extensible at this stage. Feature owners must add exact versioned payload schemas and cross-field/domain checks before handlers. A valid envelope is not an accepted command. TypeScript types cannot enforce numeric bounds, formats or all conditional rules.

P05 verifies the PostgreSQL kernel and retained ActionResult. P06 verifies membership, capability overrides and resource guards; P07 binds real OIDC sessions to those guards. AccessContext is a display snapshot, never request authority. P08 provides source-scoped provisioning/result retries and separate issuer status; general action.getResult remains later work. See [P05 evidence](../phase-05-evidence.md), [permission contract](../authorization.md) and [session contract](../identity.md).

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
    "lifecycle_forbidden",
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

### CapabilityEffect

[Canonical definition](../../contracts/common.schema.json#/$defs/CapabilityEffect)

Explicit user choice overrides the role; inherit (or no exception row) follows the current role value. Missing role grants deny. Applies equally across assigned branches.

```json
{
  "type": "string",
  "enum": [
    "inherit",
    "allow",
    "deny"
  ],
  "description": "Explicit user choice overrides the role; inherit (or no exception row) follows the current role value. Missing role grants deny. Applies equally across assigned branches."
}
```

### CapabilityOverride

[Canonical definition](../../contracts/common.schema.json#/$defs/CapabilityOverride)

Company-user override vocabulary; ERP provisioning endpoint remains P08. This object cannot grant access by appearing in a request.

```json
{
  "type": "object",
  "properties": {
    "capability": {
      "$ref": "#/$defs/Capability"
    },
    "effect": {
      "$ref": "#/$defs/CapabilityEffect"
    }
  },
  "required": [
    "capability",
    "effect"
  ],
  "additionalProperties": false,
  "description": "Company-user override vocabulary; ERP provisioning endpoint remains P08. This object cannot grant access by appearing in a request."
}
```

### AccessContext

[Canonical definition](../../contracts/common.schema.json#/$defs/AccessContext)

Server-resolved access snapshot, implemented internally in P06; session.getContext HTTP remains P07. Source is the stable account or integration UUID. Display guidance only: recheck current permissions, resource scope and lifecycle for every read/write/job/export. No role name conveys authority.

```json
{
  "type": "object",
  "description": "Server-resolved access snapshot, implemented internally in P06; session.getContext HTTP remains P07. Source is the stable account or integration UUID. Display guidance only: recheck current permissions, resource scope and lifecycle for every read/write/job/export. No role name conveys authority.",
  "properties": {
    "tenantId": {
      "$ref": "#/$defs/Uuid"
    },
    "tenantKind": {
      "type": "string",
      "enum": [
        "company",
        "personal"
      ]
    },
    "principalKind": {
      "type": "string",
      "enum": [
        "account",
        "integration"
      ]
    },
    "sourceId": {
      "$ref": "#/$defs/Uuid"
    },
    "branchIds": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Uuid"
      },
      "uniqueItems": true
    },
    "driverId": {
      "anyOf": [
        {
          "$ref": "#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "effectiveCapabilities": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Capability"
      },
      "uniqueItems": true
    }
  },
  "required": [
    "tenantId",
    "tenantKind",
    "principalKind",
    "sourceId",
    "branchIds",
    "driverId",
    "effectiveCapabilities"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "tenantKind": {
            "const": "personal"
          }
        },
        "required": [
          "tenantKind"
        ]
      },
      "then": {
        "properties": {
          "principalKind": {
            "const": "account"
          },
          "branchIds": {
            "type": "array",
            "maxItems": 0
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "principalKind": {
            "const": "integration"
          }
        },
        "required": [
          "principalKind"
        ]
      },
      "then": {
        "properties": {
          "tenantKind": {
            "const": "company"
          },
          "driverId": {
            "type": "null"
          },
          "effectiveCapabilities": {
            "type": "array",
            "items": {
              "not": {
                "enum": [
                  "execution.own",
                  "correction.own"
                ]
              }
            }
          }
        }
      }
    }
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

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/action-envelope.v1.schema.json",
  "title": "Action envelope v1 — designed",
  "description": "P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.",
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

### ActionResult

[Canonical definition](../../contracts/action-result.v1.schema.json)

P05 verifies this result in the internal PostgreSQL kernel. Authenticated action.getResult HTTP delivery remains designed pending P06-P08. A compacted result preserves the receipt and feature-owned summary; it never permits executing the action again. Full responses last at least 30 days and unresolved work is held.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/action-result.v1.schema.json",
  "title": "Durable command result v1",
  "description": "P05 verifies this result in the internal PostgreSQL kernel. Authenticated action.getResult HTTP delivery remains designed pending P06-P08. A compacted result preserves the receipt and feature-owned summary; it never permits executing the action again. Full responses last at least 30 days and unresolved work is held.",
  "type": "object",
  "properties": {
    "receipt": {
      "$ref": "./evidence-receipt.v1.schema.json"
    },
    "operationId": {
      "$ref": "./common.schema.json#/$defs/OperationId"
    },
    "retention": {
      "enum": [
        "full",
        "compacted"
      ]
    },
    "summary": {
      "type": "object",
      "additionalProperties": true,
      "description": "Minimal stable feature identity/revision references, retained for the business-record lifetime; not a copy of the full response or personal contact details."
    },
    "response": {
      "type": "object",
      "properties": {
        "status": {
          "type": "integer",
          "minimum": 200,
          "maximum": 599
        },
        "body": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "required": [
        "status",
        "body"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "receipt",
    "operationId",
    "retention",
    "summary"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "retention": {
            "const": "full"
          }
        },
        "required": [
          "retention"
        ]
      },
      "then": {
        "properties": {
          "response": true
        },
        "required": [
          "response"
        ]
      },
      "else": {
        "not": {
          "properties": {
            "response": true
          },
          "required": [
            "response"
          ]
        }
      }
    },
    {
      "properties": {
        "receipt": {
          "type": "object",
          "properties": {
            "businessStatus": {
              "enum": [
                "accepted",
                "rejected",
                "review-required"
              ]
            }
          }
        }
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

### AccountKind

[Canonical definition](../../contracts/session.schema.json#/$defs/AccountKind)

```json
{
  "type": "string",
  "enum": [
    "company",
    "personal"
  ]
}
```

### KindRequest

[Canonical definition](../../contracts/session.schema.json#/$defs/KindRequest)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "kind"
  ],
  "properties": {
    "kind": {
      "$ref": "#/$defs/AccountKind"
    }
  }
}
```

### CompanyRequest

[Canonical definition](../../contracts/session.schema.json#/$defs/CompanyRequest)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "code"
  ],
  "properties": {
    "code": {
      "type": "string",
      "pattern": "^[A-Za-z0-9-]{2,32}$"
    }
  }
}
```

### CompanyResponse

[Canonical definition](../../contracts/session.schema.json#/$defs/CompanyResponse)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "code",
    "displayName"
  ],
  "properties": {
    "code": {
      "type": "string"
    },
    "displayName": {
      "type": "string"
    }
  }
}
```

### LoginRequest

[Canonical definition](../../contracts/session.schema.json#/$defs/LoginRequest)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "kind"
  ],
  "properties": {
    "kind": {
      "$ref": "#/$defs/AccountKind"
    },
    "companyCode": {
      "type": "string",
      "pattern": "^[A-Za-z0-9-]{2,32}$"
    },
    "phone": {
      "type": "string",
      "minLength": 8,
      "maxLength": 40
    },
    "intent": {
      "type": "string",
      "enum": [
        "login",
        "register",
        "recover"
      ]
    },
    "reauthenticate": {
      "type": "boolean"
    }
  }
}
```

### RedirectResponse

[Canonical definition](../../contracts/session.schema.json#/$defs/RedirectResponse)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "authorizationUrl"
  ],
  "properties": {
    "authorizationUrl": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

### BootstrapResponse

[Canonical definition](../../contracts/session.schema.json#/$defs/BootstrapResponse)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "csrfToken"
  ],
  "properties": {
    "csrfToken": {
      "type": "string",
      "minLength": 43,
      "maxLength": 43
    }
  }
}
```

### CallbackQuery

[Canonical definition](../../contracts/session.schema.json#/$defs/CallbackQuery)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "state"
  ],
  "properties": {
    "state": {
      "type": "string",
      "minLength": 43,
      "maxLength": 43
    },
    "code": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2048
    },
    "iss": {
      "type": "string",
      "maxLength": 2048
    },
    "session_state": {
      "type": "string",
      "maxLength": 512
    },
    "error": {
      "type": "string",
      "maxLength": 128
    },
    "error_description": {
      "type": "string",
      "maxLength": 1024
    }
  }
}
```

### SessionContext

[Canonical definition](../../contracts/session.schema.json#/$defs/SessionContext)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "kind",
    "access",
    "expiresAt",
    "recoveryEmailVerified",
    "phoneOwnershipVerified",
    "loginIdentifier"
  ],
  "properties": {
    "kind": {
      "$ref": "#/$defs/AccountKind"
    },
    "access": {
      "$ref": "./common.schema.json#/$defs/AccessContext"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    },
    "loginIdentifier": {
      "type": "string",
      "minLength": 1,
      "maxLength": 512
    },
    "recoveryEmailVerified": {
      "type": "boolean"
    },
    "phoneOwnershipVerified": {
      "const": false
    }
  }
}
```

### AuthError

[Canonical definition](../../contracts/session.schema.json#/$defs/AuthError)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "error"
  ],
  "properties": {
    "error": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "code",
        "message"
      ],
      "properties": {
        "code": {
          "type": "string",
          "enum": [
            "invalid_request",
            "csrf_invalid",
            "rate_limited",
            "login_failed",
            "company_unavailable",
            "access_disabled",
            "session_expired",
            "issuer_unavailable",
            "same_account_required",
            "phone_invalid"
          ]
        },
        "message": {
          "type": "string"
        }
      }
    }
  }
}
```

### BindSource

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/BindSource)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "companyCode": {
      "type": "string",
      "pattern": "^[A-Z0-9-]{2,32}$"
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "subjectIds": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      },
      "uniqueItems": true,
      "maxItems": 100
    },
    "credentialId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "secretHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "expiresAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "companyCode",
    "displayName",
    "subjectIds",
    "credentialId",
    "secretHash",
    "expiresAt"
  ],
  "additionalProperties": false
}
```

### RotateCredential

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/RotateCredential)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "credentialId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "secretHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "expiresAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "overlapSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    },
    "recover": {
      "type": "boolean"
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "credentialId",
    "secretHash",
    "expiresAt",
    "overlapSeconds",
    "recover"
  ],
  "additionalProperties": false
}
```

### DisableSource

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DisableSource)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    }
  },
  "required": [
    "externalId",
    "sourceRevision"
  ],
  "additionalProperties": false
}
```

### Branch

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/Branch)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "enabled": {
      "type": "boolean"
    },
    "location": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Coordinates"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "name",
    "enabled",
    "location"
  ],
  "additionalProperties": false
}
```

### DisableBranch

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DisableBranch)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    }
  },
  "required": [
    "externalId",
    "sourceRevision"
  ],
  "additionalProperties": false
}
```

### Role

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/Role)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "capabilities": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/Capability"
      },
      "uniqueItems": true,
      "maxItems": 100
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "name",
    "capabilities"
  ],
  "additionalProperties": false
}
```

### User

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/User)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "subject": {
      "type": "string",
      "minLength": 1,
      "maxLength": 512
    },
    "roleExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "branchExternalIds": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/ExternalId"
      },
      "uniqueItems": true,
      "maxItems": 100
    },
    "enabled": {
      "type": "boolean"
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "subject",
    "roleExternalId",
    "branchExternalIds",
    "enabled"
  ],
  "additionalProperties": false
}
```

### UserRole

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserRole)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "roleExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "roleExternalId"
  ],
  "additionalProperties": false
}
```

### UserExceptions

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserExceptions)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "exceptions": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/CapabilityOverride"
      },
      "uniqueItems": true,
      "maxItems": 100
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "exceptions"
  ],
  "additionalProperties": false
}
```

### UserBranches

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserBranches)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "branchExternalIds": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/ExternalId"
      },
      "uniqueItems": true,
      "maxItems": 100
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "branchExternalIds"
  ],
  "additionalProperties": false
}
```

### DisableUser

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DisableUser)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    }
  },
  "required": [
    "externalId",
    "sourceRevision"
  ],
  "additionalProperties": false
}
```

### Driver

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/Driver)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "userExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "enabled": {
      "type": "boolean"
    },
    "vehicleReference": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        {
          "type": "null"
        }
      ]
    },
    "profile": {
      "enum": [
        "car",
        "motorcycle",
        "bicycle"
      ]
    }
  },
  "required": [
    "externalId",
    "sourceRevision",
    "userExternalId",
    "enabled",
    "vehicleReference",
    "profile"
  ],
  "additionalProperties": false
}
```

### VerifiedService

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/VerifiedService)

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "const": "service-operation"
    },
    "tenantId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "integrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "actorId": {
      "type": "null"
    }
  },
  "required": [
    "mode",
    "tenantId",
    "integrationId",
    "actorId"
  ],
  "additionalProperties": false
}
```

### ProvisioningStatus

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/ProvisioningStatus)

```json
{
  "type": "object",
  "properties": {
    "entity": {
      "enum": [
        "source",
        "branch",
        "role",
        "user",
        "driver"
      ]
    },
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "resourceId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "lastActionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "issuerStatus": {
      "enum": [
        "not-required",
        "pending",
        "running",
        "retry",
        "ready"
      ]
    },
    "attempts": {
      "type": "integer",
      "minimum": 0
    },
    "nextAttemptAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "lastError": {
      "enum": [
        null,
        "issuer_unavailable",
        "subject_unavailable"
      ]
    },
    "enabled": {
      "type": [
        "boolean",
        "null"
      ],
      "description": "Requested local projection enabled state; null for a role. ready plus enabled=false means disable reconciliation completed, never account-ready."
    }
  },
  "required": [
    "entity",
    "externalId",
    "resourceId",
    "sourceRevision",
    "lastActionId",
    "issuerStatus",
    "attempts",
    "nextAttemptAt",
    "lastError",
    "enabled"
  ],
  "additionalProperties": false
}
```

### SourceConfiguration

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/SourceConfiguration)

```json
{
  "type": "object",
  "properties": {
    "identity": {
      "$ref": "#/$defs/VerifiedService"
    },
    "issuer": {
      "type": "string",
      "format": "uri"
    },
    "supportedVersions": {
      "type": "array",
      "items": {
        "const": "1.0.0"
      },
      "uniqueItems": true,
      "maxItems": 100
    },
    "allowedOperations": {
      "type": "array",
      "items": {
        "$ref": "./common.schema.json#/$defs/OperationId"
      },
      "uniqueItems": true,
      "maxItems": 100
    },
    "humanDelegation": {
      "const": false
    }
  },
  "required": [
    "identity",
    "issuer",
    "supportedVersions",
    "allowedOperations",
    "humanDelegation"
  ],
  "additionalProperties": false
}
```

### ProvisioningChanged

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/ProvisioningChanged)

```json
{
  "type": "object",
  "properties": {
    "entity": {
      "enum": [
        "source",
        "branch",
        "role",
        "user",
        "driver"
      ]
    },
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "resourceId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "service": {
      "$ref": "#/$defs/VerifiedService"
    }
  },
  "required": [
    "entity",
    "externalId",
    "resourceId",
    "sourceRevision",
    "actionId",
    "service"
  ],
  "additionalProperties": false
}
```

### BindSourceCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/BindSourceCommand)

```json
{
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
      "const": "integration.bindSource"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/BindSource"
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

### RotateCredentialCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/RotateCredentialCommand)

```json
{
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
      "const": "integration.rotateCredential"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/RotateCredential"
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

### DisableSourceCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DisableSourceCommand)

```json
{
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
      "const": "integration.disableSource"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/DisableSource"
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

### BranchCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/BranchCommand)

```json
{
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
      "const": "branch.provision"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Branch"
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

### DisableBranchCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DisableBranchCommand)

```json
{
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
      "const": "branch.disable"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/DisableBranch"
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

### RoleCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/RoleCommand)

```json
{
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
      "const": "role.defineCapabilities"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Role"
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

### UserCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserCommand)

```json
{
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
      "const": "user.provision"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/User"
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

### UserRoleCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserRoleCommand)

```json
{
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
      "const": "user.setRole"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/UserRole"
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

### UserExceptionsCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserExceptionsCommand)

```json
{
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
      "const": "user.setCapabilityExceptions"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/UserExceptions"
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

### UserBranchesCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/UserBranchesCommand)

```json
{
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
      "const": "user.setBranchMemberships"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/UserBranches"
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

### DisableUserCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DisableUserCommand)

```json
{
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
      "const": "user.disable"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/DisableUser"
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

### DriverCommand

[Canonical definition](../../contracts/provisioning.schema.json#/$defs/DriverCommand)

```json
{
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
      "const": "driver.provisionReference"
    },
    "context": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "integration"
        },
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "integrationId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "kind",
        "tenantId",
        "integrationId"
      ],
      "additionalProperties": false
    },
    "resources": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "baseVersions": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "dependsOnActionIds": {
      "type": "array",
      "maxItems": 0,
      "items": {
        "$ref": "./common.schema.json#/$defs/Uuid"
      }
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Driver"
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
| action-result-full | action-result.v1.schema.json | valid foundation shape |
| action-result-compacted | action-result.v1.schema.json | valid foundation shape |
| access-effect | common.schema.json#/$defs/CapabilityEffect | valid foundation shape |
| access-inherit | common.schema.json#/$defs/CapabilityOverride | valid foundation shape |
| access-allow | common.schema.json#/$defs/CapabilityOverride | valid foundation shape |
| access-deny | common.schema.json#/$defs/CapabilityOverride | valid foundation shape |
| access-company | common.schema.json#/$defs/AccessContext | valid foundation shape |
| access-personal | common.schema.json#/$defs/AccessContext | valid foundation shape |
| access-integration | common.schema.json#/$defs/AccessContext | valid foundation shape |
| access-lifecycle-problem | common.schema.json#/$defs/Problem | valid foundation shape |
| session-company-entry | session.schema.json#/$defs/CompanyRequest | valid foundation shape |
| session-login | session.schema.json#/$defs/LoginRequest | valid foundation shape |
| session-personal-register | session.schema.json#/$defs/LoginRequest | valid foundation shape |
| session-csrf | session.schema.json#/$defs/BootstrapResponse | valid foundation shape |
| session-kind | session.schema.json#/$defs/KindRequest | valid foundation shape |
| session-denied | session.schema.json#/$defs/AuthError | valid foundation shape |
| p08-integration.bindSource | provisioning.schema.json#/$defs/BindSourceCommand | valid foundation shape |
| p08-integration.rotateCredential | provisioning.schema.json#/$defs/RotateCredentialCommand | valid foundation shape |
| p08-integration.disableSource | provisioning.schema.json#/$defs/DisableSourceCommand | valid foundation shape |
| p08-branch.provision | provisioning.schema.json#/$defs/BranchCommand | valid foundation shape |
| p08-branch.disable | provisioning.schema.json#/$defs/DisableBranchCommand | valid foundation shape |
| p08-role.defineCapabilities | provisioning.schema.json#/$defs/RoleCommand | valid foundation shape |
| p08-user.provision | provisioning.schema.json#/$defs/UserCommand | valid foundation shape |
| p08-user.setRole | provisioning.schema.json#/$defs/UserRoleCommand | valid foundation shape |
| p08-user.setCapabilityExceptions | provisioning.schema.json#/$defs/UserExceptionsCommand | valid foundation shape |
| p08-user.setBranchMemberships | provisioning.schema.json#/$defs/UserBranchesCommand | valid foundation shape |
| p08-user.disable | provisioning.schema.json#/$defs/DisableUserCommand | valid foundation shape |
| p08-driver.provisionReference | provisioning.schema.json#/$defs/DriverCommand | valid foundation shape |
| p08-status-retry | provisioning.schema.json#/$defs/ProvisioningStatus | valid foundation shape |
| p08-provisioning.changed | provisioning.schema.json#/$defs/ProvisioningChanged | valid foundation shape |
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
| action-result-full-missing-response | action-result.v1.schema.json | invalid (required) |
| action-result-compacted-with-response | action-result.v1.schema.json | invalid (not) |
| action-result-pending | action-result.v1.schema.json | invalid (enum) |
| access-unknown-effect | common.schema.json#/$defs/CapabilityOverride | invalid (enum) |
| access-branch-override | common.schema.json#/$defs/CapabilityOverride | invalid (additionalProperties) |
| access-role-name-capability | common.schema.json#/$defs/CapabilityOverride | invalid (enum) |
| access-personal-branch | common.schema.json#/$defs/AccessContext | invalid (maxItems) |
| access-integration-driver | common.schema.json#/$defs/AccessContext | invalid (type) |
| access-integration-own | common.schema.json#/$defs/AccessContext | invalid (not) |
| access-duplicate-grants | common.schema.json#/$defs/AccessContext | invalid (uniqueItems) |
| session-forged-redirect | session.schema.json#/$defs/LoginRequest | invalid (additionalProperties) |
| session-unknown-kind | session.schema.json#/$defs/KindRequest | invalid (enum) |
| session-extra-scope | session.schema.json#/$defs/KindRequest | invalid (additionalProperties) |
| session-no-state | session.schema.json#/$defs/CallbackQuery | invalid (required) |
| p08-actor | provisioning.schema.json#/$defs/UserCommand | invalid (additionalProperties) |
| p08-raw-actor | provisioning.schema.json#/$defs/UserCommand | invalid (additionalProperties) |
| p08-password | provisioning.schema.json#/$defs/UserCommand | invalid (additionalProperties) |
| p08-revision-zero | provisioning.schema.json#/$defs/UserCommand | invalid (minimum) |
| p08-multiple-roles | provisioning.schema.json#/$defs/UserCommand | invalid (additionalProperties) |
| p08-duplicate-branch | provisioning.schema.json#/$defs/UserCommand | invalid (uniqueItems) |
| p08-future-version | provisioning.schema.json#/$defs/UserCommand | invalid (const) |
| p08-scope-omitted | provisioning.schema.json#/$defs/UserCommand | invalid (required) |
| p08-unhandled-dependency | provisioning.schema.json#/$defs/UserCommand | invalid (maxItems) |

[Canonical example data](../../contracts/examples/README.md)
