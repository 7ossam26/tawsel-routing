# Tawsel public contract reference

Generated from canonical OpenAPI 3.1.1 / JSON Schema 2020-12 by `npm run contracts:generate`.

**P07–P13 sessions, ERP provisioning, intake, confirmed locations, routing metadata and durable planning are implemented locally.** See [identity setup](../identity.md), [ERP consumer guidance](../erp/consumer-quickstart.md) and [planning/forecast semantics](../planning-jobs.md). Planning stores candidate drafts, not policy-approved active rounds. Live Engine evidence, later execution and signed event delivery remain unavailable/unimplemented. Workspace `/health` is excluded. No production release or real ERP interoperability is claimed.

[State model](../tracking-and-consistency.md) · [Operation ownership](../contract-coverage.md) · [UI action mapping (designed)](../ui-actions.md) · [Integration guide](../integration-guide.md) · [Canonical OpenAPI](../../contracts/openapi.yaml)

Envelope payload objects are deliberately extensible at this stage. Feature owners must add exact versioned payload schemas and cross-field/domain checks before handlers. A valid envelope is not an accepted command. TypeScript types cannot enforce numeric bounds, formats or all conditional rules.

P05 verifies the PostgreSQL kernel and retained ActionResult. P06 verifies membership, capability overrides and resource guards; P07 binds real OIDC sessions to those guards. AccessContext is a display snapshot, never request authority. P08 provides source-scoped provisioning/result retries and separate issuer status. P09 uses the same kernel for personal-tenant create/revise retries and scoped reads; general action.getResult remains later work. See [P05 evidence](../phase-05-evidence.md), [permission contract](../authorization.md) and [session contract](../identity.md).

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
    },
    "locationRevision": {
      "$ref": "#/$defs/Revision"
    },
    "planningInputRevision": {
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
    },
    "intakeCapabilities": {
      "type": "array",
      "items": {
        "enum": [
          "intake.prepare",
          "assignment.manage"
        ]
      },
      "uniqueItems": true,
      "maxItems": 2,
      "description": "Operator-owned service grants. Omit to preserve existing grants; empty removes both."
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

### IndependentDestination

[Canonical definition](../../contracts/b2c-intake.schema.json#/$defs/IndependentDestination)

Original driver input. Address-only input remains non-executable until P11 confirms a destination.

```json
{
  "oneOf": [
    {
      "$ref": "#/$defs/AddressDestination"
    },
    {
      "$ref": "#/$defs/ConfirmedPinDestination"
    }
  ],
  "description": "Original driver input. Address-only input remains non-executable until P11 confirms a destination."
}
```

### IndependentTask

[Canonical definition](../../contracts/b2c-intake.schema.json#/$defs/IndependentTask)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "recipientName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "recipientPhone": {
      "$ref": "#/$defs/RecipientPhone"
    },
    "destination": {
      "$ref": "#/$defs/IndependentDestination"
    },
    "collectionAmount": {
      "$ref": "#/$defs/IndependentCollectionAmount"
    },
    "instructions": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
    "locationReadiness": {
      "type": "string",
      "enum": [
        "needs-resolution",
        "confirmed"
      ]
    },
    "executionReady": {
      "type": "boolean"
    },
    "editable": {
      "type": "boolean"
    },
    "createdAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "updatedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    }
  },
  "required": [
    "taskId",
    "revision",
    "recipientName",
    "recipientPhone",
    "destination",
    "locationReadiness",
    "executionReady",
    "editable",
    "createdAt",
    "updatedAt"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "locationReadiness": {
            "const": "needs-resolution"
          }
        },
        "required": [
          "locationReadiness"
        ]
      },
      "then": {
        "properties": {
          "executionReady": {
            "const": false
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "locationReadiness": {
            "const": "confirmed"
          }
        },
        "required": [
          "locationReadiness"
        ]
      },
      "then": {
        "properties": {
          "executionReady": {
            "const": true
          }
        }
      }
    }
  ]
}
```

### IndependentTaskList

[Canonical definition](../../contracts/b2c-intake.schema.json#/$defs/IndependentTaskList)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/IndependentTask"
      },
      "maxItems": 50
    },
    "nextCursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 512
    }
  },
  "required": [
    "items"
  ],
  "additionalProperties": false
}
```

### CreateIndependentCommand

[Canonical definition](../../contracts/b2c-intake.schema.json#/$defs/CreateIndependentCommand)

```json
{
  "allOf": [
    {
      "$ref": "./action-envelope.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "task.createIndependent"
        },
        "payload": {
          "$ref": "#/$defs/CreateIndependentPayload"
        }
      }
    }
  ]
}
```

### ReviseIndependentCommand

[Canonical definition](../../contracts/b2c-intake.schema.json#/$defs/ReviseIndependentCommand)

```json
{
  "allOf": [
    {
      "$ref": "./action-envelope.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "task.reviseIndependent"
        },
        "payload": {
          "$ref": "#/$defs/ReviseIndependentPayload"
        }
      }
    }
  ]
}
```

### IntakeError

[Canonical definition](../../contracts/b2c-intake.schema.json#/$defs/IntakeError)

```json
{
  "type": "object",
  "properties": {
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "message": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "fields": {
          "type": "object",
          "additionalProperties": {
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          }
        }
      },
      "required": [
        "code",
        "message"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "error"
  ],
  "additionalProperties": false
}
```

### B2bMoney

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Money)

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
      "const": "EGP"
    },
    "exponent": {
      "const": 2
    }
  },
  "required": [
    "amountMinor",
    "currency",
    "exponent"
  ],
  "additionalProperties": false
}
```

### B2bLine

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Line)

```json
{
  "type": "object",
  "properties": {
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "pattern": "\\S"
    },
    "quantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    },
    "unitDue": {
      "$ref": "#/$defs/Money"
    }
  },
  "required": [
    "sourceLineId",
    "description",
    "quantity",
    "unitDue"
  ],
  "additionalProperties": false
}
```

### B2bSourceSnapshot

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/SourceSnapshot)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "sourceBranchExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceOrderReference": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "recipientName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "pattern": "\\S"
    },
    "recipientPhone": {
      "$ref": "./b2c-intake.schema.json#/$defs/RecipientPhone"
    },
    "destination": {
      "$ref": "./b2c-intake.schema.json#/$defs/IndependentDestination"
    },
    "splittingAllowed": {
      "type": "boolean"
    },
    "allocation": {
      "const": "exact-outstanding-per-unit"
    },
    "lines": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Line"
      },
      "minItems": 1,
      "maxItems": 100
    },
    "shippingDue": {
      "$ref": "#/$defs/Money"
    },
    "totalDue": {
      "$ref": "#/$defs/Money"
    },
    "priority": {
      "enum": [
        "ordinary",
        "urgent"
      ]
    },
    "earliestAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "instructions": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000,
      "pattern": "\\S"
    }
  },
  "required": [
    "externalId",
    "sourceDispatchCycleId",
    "sourceRevision",
    "expectedSourceRevision",
    "sourceBranchExternalId",
    "recipientName",
    "recipientPhone",
    "destination",
    "splittingAllowed",
    "allocation",
    "lines",
    "shippingDue",
    "totalDue",
    "priority"
  ],
  "additionalProperties": false
}
```

### B2bAssignmentReference

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/AssignmentReference)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "expectedSourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "assignmentRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    }
  },
  "required": [
    "externalId",
    "sourceDispatchCycleId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "assignmentRevision"
  ],
  "additionalProperties": false
}
```

### B2bPrepare

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Prepare)

```json
{
  "type": "object",
  "properties": {
    "driverExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/AssignmentReference"
      },
      "minItems": 1,
      "maxItems": 100
    }
  },
  "required": [
    "driverExternalId",
    "items"
  ],
  "additionalProperties": false
}
```

### B2bReceiveBatch

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/ReceiveBatch)

```json
{
  "type": "object",
  "properties": {
    "driverExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/AssignmentReference"
      },
      "minItems": 1,
      "maxItems": 100
    },
    "receiptAsserted": {
      "const": true
    }
  },
  "required": [
    "driverExternalId",
    "items",
    "receiptAsserted"
  ],
  "additionalProperties": false
}
```

### B2bWithdraw

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Withdraw)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "expectedSourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "assignmentRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    }
  },
  "required": [
    "externalId",
    "sourceDispatchCycleId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "assignmentRevision"
  ],
  "additionalProperties": false
}
```

### B2bReassign

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Reassign)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "expectedSourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "assignmentRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "driverExternalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "receiptAsserted": {
      "type": "boolean"
    }
  },
  "required": [
    "externalId",
    "sourceDispatchCycleId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "assignmentRevision",
    "driverExternalId",
    "receiptAsserted"
  ],
  "additionalProperties": false
}
```

### B2bUrgency

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Urgency)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "expectedSourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "priority": {
      "enum": [
        "ordinary",
        "urgent"
      ]
    }
  },
  "required": [
    "externalId",
    "sourceDispatchCycleId",
    "expectedSourceRevision",
    "sourceRevision",
    "priority"
  ],
  "additionalProperties": false
}
```

### B2bSourceSnapshotCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/SourceSnapshotCommand)

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
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
      "const": "intake.submitSnapshot"
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
      "maxItems": 0
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/SourceSnapshot"
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

### B2bPrepareCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/PrepareCommand)

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
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
      "const": "intake.prepare"
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
      "maxItems": 0
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Prepare"
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

### B2bReceiveBatchCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/ReceiveBatchCommand)

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
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
      "const": "assignment.receiveBatch"
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
      "maxItems": 0
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/ReceiveBatch"
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

### B2bWithdrawCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/WithdrawCommand)

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
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
      "const": "assignment.withdraw"
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
      "maxItems": 0
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Withdraw"
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

### B2bReassignCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/ReassignCommand)

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
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
      "const": "assignment.reassignBeforeDeparture"
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
      "maxItems": 0
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Reassign"
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

### B2bUrgencyCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/UrgencyCommand)

P05 hash v1 includes every envelope field plus trusted actor identity: sorted object keys, original array order, UTF-8 JSON, no default insertion or Unicode normalization. Keep the immutable envelope across retries; source scope is authenticated and stable across token refresh. A generic valid envelope does not validate or authorize its feature payload.

```json
{
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
      "const": "intake.setUrgencyBeforeDeparture"
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
      "maxItems": 0
    },
    "observation": {
      "$ref": "./common.schema.json#/$defs/Observation"
    },
    "payload": {
      "$ref": "#/$defs/Urgency"
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

### B2bTask

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Task)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "state": {
      "enum": [
        "unassigned",
        "prepared",
        "held",
        "withdrawn"
      ]
    },
    "driverId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "driverExternalId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        {
          "type": "null"
        }
      ]
    },
    "receivedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "editable": {
      "type": "boolean"
    },
    "planningEligible": {
      "type": "boolean"
    },
    "planningStatus": {
      "type": "string",
      "enum": [
        "not-requested",
        "pending",
        "running",
        "complete",
        "partial",
        "failed",
        "superseded"
      ],
      "description": "Actual latest durable calculation state; complete is a provider candidate, not an active round or policy guarantee."
    },
    "locationReadiness": {
      "enum": [
        "needs-resolution",
        "confirmed"
      ]
    },
    "snapshot": {
      "$ref": "#/$defs/SourceSnapshot"
    }
  },
  "required": [
    "taskId",
    "dispatchCycleId",
    "externalId",
    "sourceDispatchCycleId",
    "sourceRevision",
    "assignmentRevision",
    "state",
    "driverId",
    "driverExternalId",
    "receivedAt",
    "editable",
    "planningEligible",
    "planningStatus",
    "locationReadiness",
    "snapshot"
  ],
  "additionalProperties": false
}
```

### B2bTaskList

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/TaskList)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Task"
      },
      "maxItems": 100
    },
    "nextCursor": {
      "type": "string"
    }
  },
  "required": [
    "items"
  ],
  "additionalProperties": false
}
```

### B2bBatchResult

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/BatchResult)

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "status": {
      "enum": [
        "pending",
        "accepted",
        "rejected",
        "review-required"
      ]
    },
    "result": {
      "$ref": "./action-result.v1.schema.json"
    }
  },
  "required": [
    "actionId",
    "status"
  ],
  "additionalProperties": false
}
```

### B2bChangedEvent

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/ChangedEvent)

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "task": {
      "$ref": "#/$defs/Task"
    }
  },
  "required": [
    "actionId",
    "task"
  ],
  "additionalProperties": false
}
```

### LocationCandidate

[Canonical definition](../../contracts/location.schema.json#/$defs/Candidate)

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "label": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "type": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "source": {
      "const": "nominatim"
    },
    "coordinates": {
      "$ref": "./common.schema.json#/$defs/Coordinates"
    }
  },
  "required": [
    "id",
    "label",
    "type",
    "source",
    "coordinates"
  ],
  "additionalProperties": false
}
```

### LocationSearch

[Canonical definition](../../contracts/location.schema.json#/$defs/Search)

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 2,
      "maxLength": 200
    }
  },
  "required": [
    "query"
  ],
  "additionalProperties": false
}
```

### LocationCandidates

[Canonical definition](../../contracts/location.schema.json#/$defs/Candidates)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "maxItems": 5,
      "items": {
        "$ref": "./location.schema.json#/$defs/Candidate"
      }
    },
    "attribution": {
      "type": "string"
    }
  },
  "required": [
    "items",
    "attribution"
  ],
  "additionalProperties": false
}
```

### LocationConfirm

[Canonical definition](../../contracts/location.schema.json#/$defs/Confirm)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "format": "uuid"
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "expectedLocationRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "confirmed": {
      "const": true
    },
    "selection": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "manual"
            },
            "coordinates": {
              "$ref": "./common.schema.json#/$defs/Coordinates"
            }
          },
          "required": [
            "kind",
            "coordinates"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "candidate"
            },
            "candidateId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            }
          },
          "required": [
            "kind",
            "candidateId"
          ],
          "additionalProperties": false
        }
      ]
    }
  },
  "required": [
    "taskId",
    "expectedSourceRevision",
    "expectedLocationRevision",
    "confirmed",
    "selection"
  ],
  "additionalProperties": false
}
```

### LocationPin

[Canonical definition](../../contracts/location.schema.json#/$defs/Pin)

```json
{
  "type": "object",
  "properties": {
    "coordinates": {
      "$ref": "./common.schema.json#/$defs/Coordinates"
    },
    "provenance": {
      "type": "object",
      "properties": {
        "kind": {
          "enum": [
            "manual",
            "nominatim",
            "source-confirmed"
          ]
        },
        "candidate": {
          "$ref": "./location.schema.json#/$defs/Candidate"
        }
      },
      "required": [
        "kind"
      ],
      "additionalProperties": false
    },
    "confirmedBy": {
      "type": [
        "string",
        "null"
      ],
      "format": "uuid"
    },
    "confirmedAt": {
      "type": [
        "string",
        "null"
      ],
      "format": "date-time"
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "coordinates",
    "provenance",
    "confirmedBy",
    "confirmedAt",
    "sourceRevision"
  ],
  "additionalProperties": false
}
```

### LocationList

[Canonical definition](../../contracts/location.schema.json#/$defs/List)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "$ref": "./location.schema.json#/$defs/Snapshot"
      }
    }
  },
  "required": [
    "items"
  ],
  "additionalProperties": false
}
```

### LocationMapConfiguration

[Canonical definition](../../contracts/location.schema.json#/$defs/MapConfiguration)

```json
{
  "type": "object",
  "properties": {
    "styleUrl": {
      "type": "string"
    },
    "coverage": {
      "type": "string"
    },
    "attribution": {
      "type": "string"
    }
  },
  "required": [
    "styleUrl",
    "coverage",
    "attribution"
  ],
  "additionalProperties": false
}
```

### LocationConfirmCommand

[Canonical definition](../../contracts/location.schema.json#/$defs/ConfirmCommand)

```json
{
  "allOf": [
    {
      "$ref": "./action-envelope.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "location.confirmPin"
        },
        "payload": {
          "$ref": "./location.schema.json#/$defs/Confirm"
        }
      },
      "required": [
        "operationId",
        "payload"
      ]
    }
  ]
}
```

### LocationExecutionSnapshot

[Canonical definition](../../contracts/location.schema.json#/$defs/Snapshot)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "format": "uuid"
    },
    "recipientName": {
      "type": "string"
    },
    "original": {
      "oneOf": [
        {
          "$ref": "./b2c-intake.schema.json#/$defs/AddressDestination"
        },
        {
          "$ref": "./b2c-intake.schema.json#/$defs/ConfirmedPinDestination"
        }
      ]
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "locationRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "pin": {
      "oneOf": [
        {
          "$ref": "./location.schema.json#/$defs/Pin"
        },
        {
          "type": "null"
        }
      ]
    },
    "locationReadiness": {
      "enum": [
        "confirmed",
        "needs-resolution"
      ]
    },
    "editable": {
      "type": "boolean"
    },
    "planningInputRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "planningStatus": {
      "type": "string",
      "enum": [
        "not-requested",
        "pending",
        "running",
        "complete",
        "partial",
        "failed",
        "superseded"
      ],
      "description": "Actual latest durable calculation state; complete is a provider candidate, not an active round or policy guarantee."
    }
  },
  "required": [
    "taskId",
    "recipientName",
    "original",
    "sourceRevision",
    "locationRevision",
    "pin",
    "locationReadiness",
    "editable",
    "planningInputRevision",
    "planningStatus"
  ],
  "additionalProperties": false
}
```

### LocationConfirmedEvent

[Canonical definition](../../contracts/location.schema.json#/$defs/ConfirmedEvent)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "actionId",
    "location"
  ],
  "properties": {
    "actionId": {
      "type": "string",
      "format": "uuid"
    },
    "location": {
      "$ref": "#/$defs/Snapshot"
    }
  }
}
```

### RoutingMode

[Canonical definition](../../contracts/routing.schema.json#/$defs/Mode)

```json
{
  "type": "string",
  "enum": [
    "car",
    "motorcycle",
    "bicycle"
  ]
}
```

### RoutingOrigin

[Canonical definition](../../contracts/routing.schema.json#/$defs/Origin)

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "enum": [
        "last-confirmed-stop",
        "manual-pin",
        "branch-pin"
      ]
    },
    "coordinates": {
      "$ref": "common.schema.json#/$defs/Coordinates"
    }
  },
  "required": [
    "kind",
    "coordinates"
  ],
  "additionalProperties": false
}
```

### RoutingEndpoint

[Canonical definition](../../contracts/routing.schema.json#/$defs/Endpoint)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "last-customer"
        }
      },
      "required": [
        "kind"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "fixed"
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        }
      },
      "required": [
        "kind",
        "coordinates"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "branch"
        },
        "branchId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        "serviceEstimateSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 86400
        }
      },
      "required": [
        "kind",
        "branchId",
        "coordinates",
        "serviceEstimateSeconds"
      ],
      "additionalProperties": false
    }
  ]
}
```

### RoutingJob

[Canonical definition](../../contracts/routing.schema.json#/$defs/Job)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "coordinates": {
      "$ref": "common.schema.json#/$defs/Coordinates"
    },
    "serviceEstimateSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400,
      "description": "Optional customer service estimate; adapter applies 600 seconds when omitted."
    }
  },
  "required": [
    "taskId",
    "coordinates"
  ],
  "additionalProperties": false
}
```

### RoutingOptimizationInput

[Canonical definition](../../contracts/routing.schema.json#/$defs/OptimizationInput)

Internal normalized planning boundary; not an available HTTP operation. Origin must be resolved from authoritative physical confirmation or explicit pin by the caller. Default customer service is 600 seconds. Relative timing starts at zero; urgency/earliest availability/stitched policy are validated above the adapter in P14.

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "#/$defs/Mode"
    },
    "accountKind": {
      "type": "string",
      "enum": [
        "personal",
        "company"
      ]
    },
    "origin": {
      "$ref": "#/$defs/Origin"
    },
    "endpoint": {
      "$ref": "#/$defs/Endpoint"
    },
    "tasks": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Job"
      },
      "minItems": 1,
      "maxItems": 50
    }
  },
  "required": [
    "mode",
    "accountKind",
    "origin",
    "endpoint",
    "tasks"
  ],
  "additionalProperties": false,
  "description": "Internal normalized planning boundary; not an available HTTP operation. Origin must be resolved from authoritative physical confirmation or explicit pin by the caller. Default customer service is 600 seconds. Relative timing starts at zero; urgency/earliest availability/stitched policy are validated above the adapter in P14."
}
```

### RoutingRouteInput

[Canonical definition](../../contracts/routing.schema.json#/$defs/RouteInput)

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "#/$defs/Mode"
    },
    "coordinates": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Coordinates"
      },
      "minItems": 2,
      "maxItems": 52
    }
  },
  "required": [
    "mode",
    "coordinates"
  ],
  "additionalProperties": false
}
```

### RoutingTableInput

[Canonical definition](../../contracts/routing.schema.json#/$defs/TableInput)

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "#/$defs/Mode"
    },
    "coordinates": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Coordinates"
      },
      "minItems": 1,
      "maxItems": 52
    }
  },
  "required": [
    "mode",
    "coordinates"
  ],
  "additionalProperties": false
}
```

### RoutingLeg

[Canonical definition](../../contracts/routing.schema.json#/$defs/Leg)

```json
{
  "type": "object",
  "properties": {
    "durationSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "distanceMetres": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "durationSeconds",
    "distanceMetres"
  ],
  "additionalProperties": false
}
```

### RoutingRouteResult

[Canonical definition](../../contracts/routing.schema.json#/$defs/RouteResult)

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "#/$defs/Mode"
    },
    "status": {
      "const": "complete"
    },
    "geometrySource": {
      "const": "osrm-road"
    },
    "geometry": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Coordinates"
      },
      "minItems": 2,
      "maxItems": 100000
    },
    "durationSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "distanceMetres": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "legs": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Leg"
      },
      "minItems": 1,
      "maxItems": 51
    }
  },
  "required": [
    "mode",
    "status",
    "geometrySource",
    "geometry",
    "durationSeconds",
    "distanceMetres",
    "legs"
  ],
  "additionalProperties": false
}
```

### RoutingTableCell

[Canonical definition](../../contracts/routing.schema.json#/$defs/TableCell)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "status": {
          "const": "reachable"
        },
        "durationSeconds": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "distanceMetres": {
          "type": "number",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "status",
        "durationSeconds",
        "distanceMetres"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "status": {
          "const": "unreachable"
        }
      },
      "required": [
        "status"
      ],
      "additionalProperties": false
    }
  ]
}
```

### RoutingTableResult

[Canonical definition](../../contracts/routing.schema.json#/$defs/TableResult)

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "#/$defs/Mode"
    },
    "status": {
      "type": "string",
      "enum": [
        "complete",
        "partial"
      ]
    },
    "cells": {
      "type": "array",
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/$defs/TableCell"
        },
        "minItems": 1,
        "maxItems": 52
      },
      "minItems": 1,
      "maxItems": 52
    }
  },
  "required": [
    "mode",
    "status",
    "cells"
  ],
  "additionalProperties": false
}
```

### RoutingVisit

[Canonical definition](../../contracts/routing.schema.json#/$defs/Visit)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "coordinates": {
      "$ref": "common.schema.json#/$defs/Coordinates"
    },
    "arrivalOffsetSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "travelDurationSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "distanceMetres": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "serviceEstimateSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    },
    "waitingSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "taskId",
    "coordinates",
    "arrivalOffsetSeconds",
    "travelDurationSeconds",
    "distanceMetres",
    "serviceEstimateSeconds",
    "waitingSeconds"
  ],
  "additionalProperties": false
}
```

### RoutingOptimizationResult

[Canonical definition](../../contracts/routing.schema.json#/$defs/OptimizationResult)

Validated provider candidate only, not a published or policy-verified route, arrival, receipt, outcome or actual dwell time. No optimizer geometry is promoted as a verified road route; request OSRM route separately.

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "#/$defs/Mode"
    },
    "status": {
      "type": "string",
      "enum": [
        "complete",
        "partial"
      ]
    },
    "policyValidated": {
      "const": false
    },
    "visits": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Visit"
      },
      "minItems": 0,
      "maxItems": 50
    },
    "unassignedTaskIds": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      "minItems": 0,
      "maxItems": 50
    },
    "travelDurationSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "distanceMetres": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "customerServiceEstimateSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "branchServiceEstimateSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    },
    "waitingSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "finishOffsetSeconds": {
      "type": "number",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "endpoint": {
      "$ref": "#/$defs/Endpoint"
    }
  },
  "required": [
    "mode",
    "status",
    "policyValidated",
    "visits",
    "unassignedTaskIds",
    "travelDurationSeconds",
    "distanceMetres",
    "customerServiceEstimateSeconds",
    "branchServiceEstimateSeconds",
    "waitingSeconds",
    "finishOffsetSeconds",
    "endpoint"
  ],
  "additionalProperties": false,
  "description": "Validated provider candidate only, not a published or policy-verified route, arrival, receipt, outcome or actual dwell time. No optimizer geometry is promoted as a verified road route; request OSRM route separately."
}
```

### RoutingFailure

[Canonical definition](../../contracts/routing.schema.json#/$defs/Failure)

```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "enum": [
        "invalid_input",
        "invalid_config",
        "busy",
        "timeout",
        "cancelled",
        "unavailable",
        "http_error",
        "provider_error",
        "invalid_response",
        "no_route",
        "no_table"
      ]
    },
    "provider": {
      "type": "string",
      "enum": [
        "osrm",
        "vroom",
        "boundary"
      ]
    }
  },
  "required": [
    "code",
    "provider"
  ],
  "additionalProperties": false
}
```

### RoutingProfiles

[Canonical definition](../../contracts/routing.schema.json#/$defs/Profiles)

```json
{
  "type": "object",
  "properties": {
    "modes": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Mode"
      },
      "minItems": 3,
      "maxItems": 3,
      "uniqueItems": true
    },
    "defaultCustomerServiceSeconds": {
      "type": "integer",
      "const": 600
    },
    "liveVerification": {
      "type": "string",
      "const": "not-checked"
    }
  },
  "required": [
    "modes",
    "defaultCustomerServiceSeconds",
    "liveVerification"
  ],
  "additionalProperties": false
}
```

### PlanningStatus

[Canonical definition](../../contracts/planning.schema.json#/$defs/Status)

```json
{
  "type": "string",
  "enum": [
    "pending",
    "running",
    "complete",
    "partial",
    "failed",
    "superseded"
  ]
}
```

### PlanningSettings

[Canonical definition](../../contracts/planning.schema.json#/$defs/Settings)

Explicit manual origin; never GPS or claimed physical arrival. plannedStartAt is a forecast anchor, not a round start. Branch endpoint pin is explicitly selected and scoped; P14 validates its route policy.

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "routing.schema.json#/$defs/Mode"
    },
    "origin": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "manual-pin"
        },
        "coordinates": {
          "$ref": "common.schema.json#/$defs/Coordinates"
        }
      },
      "required": [
        "kind",
        "coordinates"
      ],
      "additionalProperties": false
    },
    "endpoint": {
      "$ref": "routing.schema.json#/$defs/Endpoint",
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "kind": {
                "const": "branch"
              }
            },
            "required": [
              "kind"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "branchId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              }
            }
          }
        }
      ]
    },
    "plannedStartAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "mode",
    "origin",
    "endpoint",
    "plannedStartAt"
  ],
  "additionalProperties": false,
  "description": "Explicit manual origin; never GPS or claimed physical arrival. plannedStartAt is a forecast anchor, not a round start. Branch endpoint pin is explicitly selected and scoped; P14 validates its route policy."
}
```

### PlanningSaveDraft

[Canonical definition](../../contracts/planning.schema.json#/$defs/SaveDraft)

```json
{
  "type": "object",
  "properties": {
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedSettingsRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "settings": {
      "$ref": "#/$defs/Settings"
    }
  },
  "required": [
    "driverId",
    "expectedSettingsRevision",
    "settings"
  ],
  "additionalProperties": false
}
```

### PlanningRequest

[Canonical definition](../../contracts/planning.schema.json#/$defs/Request)

```json
{
  "type": "object",
  "properties": {
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedSettingsRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "driverId",
    "expectedSettingsRevision"
  ],
  "additionalProperties": false
}
```

### PlanningMember

[Canonical definition](../../contracts/planning.schema.json#/$defs/Member)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "branchId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "integrationId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "pinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "coordinates": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Coordinates"
        },
        {
          "type": "null"
        }
      ]
    },
    "priority": {
      "enum": [
        "ordinary",
        "urgent"
      ]
    },
    "earliestAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    },
    "departureAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    },
    "reservationState": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "eligible": {
      "type": "boolean"
    },
    "exclusionReason": {
      "anyOf": [
        {
          "enum": [
            "not-held",
            "location-unresolved",
            "future",
            "not-reserved",
            "resolved-or-paused"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "serviceEstimateSeconds": {
      "const": 600
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "dispatchCycleId",
    "branchId",
    "integrationId",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "coordinates",
    "priority",
    "earliestAt",
    "departureAt",
    "reservationState",
    "eligible",
    "exclusionReason",
    "serviceEstimateSeconds"
  ],
  "additionalProperties": false
}
```

### PlanningInput

[Canonical definition](../../contracts/planning.schema.json#/$defs/Input)

```json
{
  "type": "object",
  "properties": {
    "version": {
      "const": 1
    },
    "tenantId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "accountKind": {
      "enum": [
        "personal",
        "company"
      ]
    },
    "inputRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "settingsRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "executionRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "manualRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "currentTarget": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "taskId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "attemptId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            },
            "revision": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "taskId",
            "attemptId",
            "revision"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "locationInputRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "settings": {
      "anyOf": [
        {
          "$ref": "#/$defs/Settings"
        },
        {
          "type": "null"
        }
      ]
    },
    "members": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Member"
      }
    }
  },
  "required": [
    "version",
    "tenantId",
    "driverId",
    "accountKind",
    "inputRevision",
    "settingsRevision",
    "executionRevision",
    "manualRevision",
    "currentTarget",
    "locationInputRevision",
    "settings",
    "members"
  ],
  "additionalProperties": false
}
```

### PlanningJob

[Canonical definition](../../contracts/planning.schema.json#/$defs/Job)

Durable calculation state. complete means complete provider candidate, not policy-approved route or active round. Superseded work never becomes current. Poll by stable jobId after API/worker restart.

```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "status": {
      "$ref": "#/$defs/Status"
    },
    "fingerprint": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "settingsRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "blockedReason": {
      "anyOf": [
        {
          "enum": [
            "settings-required",
            "no-eligible-work",
            "capacity-exceeded"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "attempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "leaseExpiresAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    },
    "nextAttemptAt": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "anyOf": [
        {
          "$ref": "routing.schema.json#/$defs/Failure"
        },
        {
          "type": "null"
        }
      ]
    },
    "planId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "supersededByJobId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "finishedAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "jobId",
    "driverId",
    "status",
    "fingerprint",
    "settingsRevision",
    "blockedReason",
    "attempts",
    "leaseExpiresAt",
    "nextAttemptAt",
    "error",
    "planId",
    "supersededByJobId",
    "createdAt",
    "finishedAt"
  ],
  "additionalProperties": false,
  "description": "Durable calculation state. complete means complete provider candidate, not policy-approved route or active round. Superseded work never becomes current. Poll by stable jobId after API/worker restart.",
  "allOf": [
    {
      "if": {
        "type": "object",
        "properties": {
          "status": {
            "enum": [
              "running"
            ]
          }
        },
        "required": [
          "status"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "leaseExpiresAt": {
            "type": "string",
            "format": "date-time"
          },
          "attempts": {
            "type": "integer",
            "minimum": 1
          }
        }
      }
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "status": {
            "enum": [
              "pending",
              "complete",
              "partial",
              "failed",
              "superseded"
            ]
          }
        },
        "required": [
          "status"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "leaseExpiresAt": {
            "type": "null"
          }
        }
      }
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "status": {
            "enum": [
              "pending",
              "running"
            ]
          }
        },
        "required": [
          "status"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "planId": {
            "type": "null"
          },
          "finishedAt": {
            "type": "null"
          }
        }
      }
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "status": {
            "enum": [
              "complete",
              "partial"
            ]
          }
        },
        "required": [
          "status"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "planId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "finishedAt": {
            "type": "string",
            "format": "date-time"
          },
          "error": {
            "type": "null"
          },
          "blockedReason": {
            "type": "null"
          }
        }
      }
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "status": {
            "enum": [
              "failed",
              "superseded"
            ]
          }
        },
        "required": [
          "status"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "planId": {
            "type": "null"
          },
          "finishedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    }
  ]
}
```

### PlanningDraftResult

[Canonical definition](../../contracts/planning.schema.json#/$defs/DraftResult)

```json
{
  "type": "object",
  "properties": {
    "settingsRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "job": {
      "$ref": "#/$defs/Job"
    }
  },
  "required": [
    "settingsRevision",
    "job"
  ],
  "additionalProperties": false
}
```

### PlanningForecastMember

[Canonical definition](../../contracts/planning.schema.json#/$defs/ForecastMember)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "pinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "membership": {
      "enum": [
        "assigned",
        "unassigned",
        "excluded"
      ]
    },
    "exclusionReason": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "position": {
      "anyOf": [
        {
          "type": "integer",
          "minimum": 1
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedArrivalAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedCompletionAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "dispatchCycleId",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "membership",
    "exclusionReason",
    "position",
    "expectedArrivalAt",
    "expectedCompletionAt"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "type": "object",
        "properties": {
          "membership": {
            "const": "assigned"
          }
        },
        "required": [
          "membership"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "position": {
            "type": "integer",
            "minimum": 1
          },
          "expectedArrivalAt": {
            "type": "string",
            "format": "date-time"
          },
          "expectedCompletionAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "else": {
        "type": "object",
        "properties": {
          "position": {
            "type": "null"
          },
          "expectedArrivalAt": {
            "type": "null"
          },
          "expectedCompletionAt": {
            "type": "null"
          }
        }
      }
    }
  ]
}
```

### PlanningForecast

[Canonical definition](../../contracts/planning.schema.json#/$defs/Forecast)

```json
{
  "type": "object",
  "properties": {
    "forecastId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workloadId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "kind": {
      "const": "planning-estimate"
    },
    "timeOrigin": {
      "type": "string",
      "format": "date-time"
    },
    "expectedFinishAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    },
    "members": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/ForecastMember"
      }
    }
  },
  "required": [
    "forecastId",
    "workloadId",
    "kind",
    "timeOrigin",
    "expectedFinishAt",
    "members"
  ],
  "additionalProperties": false
}
```

### PlanningPlan

[Canonical definition](../../contracts/planning.schema.json#/$defs/Plan)

Immutable draft and forecast. P14 owns policy validation; P15 binds a chosen revision at first start. No baseline is overwritten.

```json
{
  "type": "object",
  "properties": {
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "jobId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "fingerprint": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "state": {
      "const": "draft"
    },
    "current": {
      "type": "boolean"
    },
    "inputCurrent": {
      "type": "boolean"
    },
    "policyValidated": {
      "const": false
    },
    "candidate": {
      "$ref": "routing.schema.json#/$defs/OptimizationResult"
    },
    "input": {
      "$ref": "#/$defs/Input"
    },
    "forecast": {
      "$ref": "#/$defs/Forecast"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "planId",
    "jobId",
    "driverId",
    "revision",
    "fingerprint",
    "state",
    "current",
    "inputCurrent",
    "policyValidated",
    "candidate",
    "input",
    "forecast",
    "createdAt"
  ],
  "additionalProperties": false,
  "description": "Immutable draft and forecast. P14 owns policy validation; P15 binds a chosen revision at first start. No baseline is overwritten.",
  "allOf": [
    {
      "if": {
        "type": "object",
        "properties": {
          "candidate": {
            "type": "object",
            "properties": {
              "status": {
                "const": "partial"
              }
            },
            "required": [
              "status"
            ]
          }
        }
      },
      "then": {
        "type": "object",
        "properties": {
          "forecast": {
            "type": "object",
            "properties": {
              "expectedFinishAt": {
                "type": "null"
              }
            }
          }
        }
      },
      "else": {
        "type": "object",
        "properties": {
          "forecast": {
            "type": "object",
            "properties": {
              "expectedFinishAt": {
                "type": "string",
                "format": "date-time"
              }
            }
          }
        }
      }
    }
  ]
}
```

### PlanningPlans

[Canonical definition](../../contracts/planning.schema.json#/$defs/Plans)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Plan"
      }
    },
    "nextCursor": {
      "anyOf": [
        {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        {
          "type": "null"
        }
      ]
    },
    "latestJob": {
      "anyOf": [
        {
          "$ref": "#/$defs/Job"
        },
        {
          "type": "null"
        }
      ]
    },
    "settingsRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "items",
    "nextCursor",
    "latestJob",
    "settingsRevision"
  ],
  "additionalProperties": false
}
```

### PlanningPublishedEvent

[Canonical definition](../../contracts/planning.schema.json#/$defs/PublishedEvent)

```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "forecastId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workloadId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "state": {
      "const": "draft"
    },
    "status": {
      "enum": [
        "complete",
        "partial"
      ]
    },
    "policyValidated": {
      "const": false
    }
  },
  "required": [
    "jobId",
    "planId",
    "driverId",
    "revision",
    "forecastId",
    "workloadId",
    "state",
    "status",
    "policyValidated"
  ],
  "additionalProperties": false
}
```

### PlanningSaveDraftCommand

[Canonical definition](../../contracts/planning.schema.json#/$defs/SaveDraftCommand)

```json
{
  "allOf": [
    {
      "$ref": "action-envelope.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "planning.saveDraft"
        },
        "payload": {
          "$ref": "#/$defs/SaveDraft"
        }
      }
    }
  ]
}
```

### PlanningRequestPreviewCommand

[Canonical definition](../../contracts/planning.schema.json#/$defs/RequestPreviewCommand)

```json
{
  "allOf": [
    {
      "$ref": "action-envelope.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "planning.requestPreview"
        },
        "payload": {
          "$ref": "#/$defs/Request"
        }
      }
    }
  ]
}
```

### PlanningRequestReplanCommand

[Canonical definition](../../contracts/planning.schema.json#/$defs/RequestReplanCommand)

```json
{
  "allOf": [
    {
      "$ref": "action-envelope.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "planning.requestReplan"
        },
        "payload": {
          "$ref": "#/$defs/Request"
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
| p09-create-address-task | b2c-intake.schema.json#/$defs/CreateIndependentCommand | valid foundation shape |
| p09-confirmed-pin-task | b2c-intake.schema.json#/$defs/IndependentTask | valid foundation shape |
| p10-SourceSnapshot | b2b-intake.schema.json#/$defs/SourceSnapshotCommand | valid foundation shape |
| p10-Prepare | b2b-intake.schema.json#/$defs/PrepareCommand | valid foundation shape |
| p10-ReceiveBatch | b2b-intake.schema.json#/$defs/ReceiveBatchCommand | valid foundation shape |
| p10-Withdraw | b2b-intake.schema.json#/$defs/WithdrawCommand | valid foundation shape |
| p10-Reassign | b2b-intake.schema.json#/$defs/ReassignCommand | valid foundation shape |
| p10-Urgency | b2b-intake.schema.json#/$defs/UrgencyCommand | valid foundation shape |
| p10-explicit-prepaid | b2b-intake.schema.json#/$defs/SourceSnapshot | valid foundation shape |
| p10-exact-partial-prepaid | b2b-intake.schema.json#/$defs/SourceSnapshot | valid foundation shape |
| p10-error-capacity_exceeded | common.schema.json#/$defs/Problem | valid foundation shape |
| p10-error-unsupported_price_allocation | common.schema.json#/$defs/Problem | valid foundation shape |
| p10-error-stale_revision | common.schema.json#/$defs/Problem | valid foundation shape |
| p10-received-event-intent | b2b-intake.schema.json#/$defs/ChangedEvent | valid foundation shape |
| location-valid-confirmation | location.schema.json#/$defs/Confirm | valid foundation shape |
| routing-bicycle-input | routing.schema.json#/$defs/OptimizationInput | valid foundation shape |
| routing-unreachable-table | routing.schema.json#/$defs/TableResult | valid foundation shape |
| routing-profile-metadata | routing.schema.json#/$defs/Profiles | valid foundation shape |
| p13-settings | planning.schema.json#/$defs/Settings | valid foundation shape |
| p13-input | planning.schema.json#/$defs/Input | valid foundation shape |
| p13-pending | planning.schema.json#/$defs/Job | valid foundation shape |
| p13-partial | planning.schema.json#/$defs/Plan | valid foundation shape |
| p13-save-draft | planning.schema.json#/$defs/SaveDraftCommand | valid foundation shape |
| p13-request | planning.schema.json#/$defs/RequestReplanCommand | valid foundation shape |
| p13-publication-event | planning.schema.json#/$defs/PublishedEvent | valid foundation shape |
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
| p09-phone-required | b2c-intake.schema.json#/$defs/CreateIndependentPayload | invalid (required) |
| p09-amount-must-use-supported-exponent | b2c-intake.schema.json#/$defs/CreateIndependentPayload | invalid (const) |
| p10-fractional-piece | b2b-intake.schema.json#/$defs/SourceSnapshot | invalid (type) |
| p10-missing-unit-due | b2b-intake.schema.json#/$defs/SourceSnapshot | invalid (required) |
| p10-ambiguous-deposit | b2b-intake.schema.json#/$defs/SourceSnapshot | invalid (additionalProperties) |
| p10-missing-splitting-permission | b2b-intake.schema.json#/$defs/SourceSnapshot | invalid (required) |
| p10-mixed-currency | b2b-intake.schema.json#/$defs/SourceSnapshot | invalid (const) |
| p10-unasserted-receipt | b2b-intake.schema.json#/$defs/ReceiveBatch | invalid (const) |
| location-invalid-confirmation | location.schema.json#/$defs/Confirm | invalid (maximum) |
| routing-gps-origin | routing.schema.json#/$defs/OptimizationInput | invalid (enum) |
| routing-provider-label | routing.schema.json#/$defs/OptimizationInput | invalid (enum) |
| routing-positional-coordinate | routing.schema.json#/$defs/OptimizationInput | invalid (type) |
| p13-fake-active | planning.schema.json#/$defs/Plan | invalid (const) |
| p13-fake-policy | planning.schema.json#/$defs/Plan | invalid (const) |
| p13-gps-origin | planning.schema.json#/$defs/Settings | invalid (const) |
| p13-missing-attempt | planning.schema.json#/$defs/Input | invalid (required) |
| p13-fake-status | planning.schema.json#/$defs/Job | invalid (enum) |
| p13-negative-revision | planning.schema.json#/$defs/SaveDraftCommand | invalid (minimum) |
| p13-impossible-complete | planning.schema.json#/$defs/Job | invalid (type) |
| p13-impossible-running | planning.schema.json#/$defs/Job | invalid (type) |

[Canonical example data](../../contracts/examples/README.md)
