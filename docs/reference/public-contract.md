# Tawsel public contract reference

Generated from canonical OpenAPI 3.1.1 / JSON Schema 2020-12 by `npm run contracts:generate`.

**P07–P27 sessions, ERP provisioning, intake, confirmed locations, routing metadata, durable planning online round start and explicit current activity are implemented locally.** See [identity setup](../identity.md), [ERP consumer guidance](../erp/consumer-quickstart.md) and [planning/forecast semantics](../planning-jobs.md). Planning stores validated ready/partial and explicit manual revisions. P15 starts one online authoritative round with immutable first-forecast references. P16 records explicit heading/arrival and physical origin; next remains a suggestion. P17 records exact whole-piece outcomes, reported collection and atomic progress with durable source intent. P18 adds explicit deferral/whole retry/driver urgency and preserves prior attempt fees. P19 adds explicit round/day closure, current-holder carry-forward, basic workday summaries and pending closure replay. P20 adds same-driver online takeover, generation snapshot tokens, consistent execution fencing, durable former-device evidence and dynamically constrained recovery metadata. P21 adds source-branch offers, actual subset receipt, separate disposition, current custody and claimed-subset confirmation. P22 adds visible branch segments, claimed-subset resume from confirmed branch origin and new dispatch cycles allocated only from actual receipts. P23 adds bounded driver correction and explicit compatible outcome adoption with preserved history and effective totals. P24 adds repeatable-read conditional scoped snapshots/history, distinct shipment/attempt/piece counters and server refresh/write timing. P25 adds durable signed delivery, scoped status/retry/replay and public signature verification; P26 adds independent durable receipt/projection, received/applied reports and scoped replay/checkpoint recovery with honest history gaps. P27 adds native private OIDC forms, transactional source commands and public command status with a standalone two-way proof. P34 adds ordered original-ID replay, independent durable receipts, paged evidence and bounded explicit adoption; see [protocol](../ordered-replay.md) and [evidence](../phase-34-evidence.md). P35 adds same-account OIDC restrictions, durable account exit and pending-aware application/local upgrades; see [compatibility](../offline-account-updates.md) and [evidence](../phase-35-evidence.md). P36/P37 reports and authorized Excel and P38 operator diagnostics are also implemented. [P42 handoff](../ERP-INTEGRATION-HANDOFF.md) and [manifest](../erp/release-manifest.json) identify the local candidate. Live Engine evidence remains unavailable. Workspace `/health` is excluded; operator diagnostics and consumer-hosted routes retain their distinct authorities. No deployed release or commercial ERP interoperability is claimed.

[State model](../tracking-and-consistency.md) · [Operation ownership](../contract-coverage.md) · [UI action mapping](../ui-actions.md) · [Integration guide](../integration-guide.md) · [Canonical OpenAPI](../../contracts/openapi.yaml)

The common envelope is extensible; implemented commands additionally validate their closed feature payload schemas and domain rules. Reserved examples do not publish unavailable operations. A valid envelope is not an accepted command. TypeScript types cannot enforce numeric bounds, formats or all conditional rules.

P05 verifies the PostgreSQL kernel and retained ActionResult. P06 verifies membership, capability overrides and resource guards; P07 binds real OIDC sessions to those guards. AccessContext is a display snapshot, never request authority. P08 provides source-scoped provisioning/result retries and separate issuer status. P09 uses the same kernel for personal-tenant create/revise retries and scoped reads; P20 action.getResult covers scoped round execution/takeover records; P15 exposes round.getStartResult for start actions and P16 current.getResult for its own activity actions. See [P05 evidence](../phase-05-evidence.md), [permission contract](../authorization.md) and [session contract](../identity.md).

## Common schemas and envelopes

### DiagnosticsHealth

[Canonical definition](../../contracts/diagnostics.schema.json#/$defs/Health)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "observedAt": {
      "type": "string",
      "format": "date-time"
    },
    "liveness": {
      "const": "alive"
    },
    "database": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "state": {
              "const": "ready"
            },
            "version": {
              "type": "string"
            },
            "bytes": {
              "type": [
                "number",
                "null"
              ],
              "minimum": 0
            },
            "active": {
              "type": "integer",
              "minimum": 0
            },
            "blocked": {
              "type": "integer",
              "minimum": 0
            },
            "deadlocks": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "state",
            "version",
            "bytes",
            "active",
            "blocked",
            "deadlocks"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "state": {
              "const": "unavailable"
            }
          },
          "required": [
            "state"
          ]
        }
      ]
    },
    "workers": {
      "anyOf": [
        {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "worker": {
                "enum": [
                  "planning",
                  "outbox",
                  "provisioning"
                ]
              },
              "state": {
                "enum": [
                  "unknown",
                  "stale",
                  "recent-loop"
                ]
              },
              "observedAt": {
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
              "ageMs": {
                "anyOf": [
                  {
                    "type": "number",
                    "minimum": 0
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "elapsedMs": {
                "anyOf": [
                  {
                    "type": "number",
                    "minimum": 0
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "worked": {
                "anyOf": [
                  {
                    "type": "boolean"
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            },
            "required": [
              "worker",
              "state",
              "observedAt",
              "ageMs",
              "elapsedMs",
              "worked"
            ]
          },
          "maxItems": 3
        },
        {
          "type": "null"
        }
      ]
    },
    "planning": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pending": {
              "type": "integer",
              "minimum": 0
            },
            "running": {
              "type": "integer",
              "minimum": 0
            },
            "failed": {
              "type": "integer",
              "minimum": 0
            },
            "blocked": {
              "type": "integer",
              "minimum": 0
            },
            "expired_leases": {
              "type": "integer",
              "minimum": 0
            },
            "oldest_ms": {
              "type": "number",
              "minimum": 0
            },
            "engine_errors": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "pending",
            "running",
            "failed",
            "blocked",
            "expired_leases",
            "oldest_ms",
            "engine_errors"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "sender": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pending": {
              "type": "integer",
              "minimum": 0
            },
            "sending": {
              "type": "integer",
              "minimum": 0
            },
            "failed": {
              "type": "integer",
              "minimum": 0
            },
            "received": {
              "type": "integer",
              "minimum": 0
            },
            "expired_leases": {
              "type": "integer",
              "minimum": 0
            },
            "oldest_ms": {
              "type": "number",
              "minimum": 0
            }
          },
          "required": [
            "pending",
            "sending",
            "failed",
            "received",
            "expired_leases",
            "oldest_ms"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "projection": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "streams": {
              "type": "integer",
              "minimum": 0
            },
            "unknown": {
              "type": "integer",
              "minimum": 0
            },
            "unapplied_or_unreported": {
              "type": "integer",
              "minimum": 0
            },
            "oldest_report_ms": {
              "anyOf": [
                {
                  "type": "number",
                  "minimum": 0
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "streams",
            "unknown",
            "unapplied_or_unreported",
            "oldest_report_ms"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "engine": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "availability": {
              "const": "not-probed"
            },
            "persistedJobErrors": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "availability",
            "persistedJobErrors"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "availability": {
              "const": "unknown"
            }
          },
          "required": [
            "availability"
          ]
        }
      ]
    },
    "backup": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "readiness": {
          "const": "unverified"
        },
        "lastVerifiedRestoreAt": {
          "type": "null"
        }
      },
      "required": [
        "readiness",
        "lastVerifiedRestoreAt"
      ]
    }
  },
  "required": [
    "observedAt",
    "liveness",
    "database",
    "workers",
    "planning",
    "sender",
    "projection",
    "engine",
    "backup"
  ]
}
```

### DiagnosticsMetrics

[Canonical definition](../../contracts/diagnostics.schema.json#/$defs/Metrics)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "observedAt": {
      "type": "string",
      "format": "date-time"
    },
    "scope": {
      "const": "this-api-process"
    },
    "uptimeSeconds": {
      "type": "number",
      "minimum": 0
    },
    "metrics": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "http": {
          "$ref": "#/$defs/Metric"
        },
        "transaction": {
          "$ref": "#/$defs/Metric"
        },
        "query": {
          "$ref": "#/$defs/Metric"
        },
        "poolWait": {
          "$ref": "#/$defs/Metric"
        },
        "commit": {
          "$ref": "#/$defs/Metric"
        },
        "engine": {
          "$ref": "#/$defs/Metric"
        },
        "export": {
          "$ref": "#/$defs/Metric"
        }
      }
    },
    "pool": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "total": {
          "type": "integer",
          "minimum": 0
        },
        "idle": {
          "type": "integer",
          "minimum": 0
        },
        "waiting": {
          "type": "integer",
          "minimum": 0
        },
        "max": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "total",
        "idle",
        "waiting",
        "max"
      ]
    },
    "process": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "memory": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "rss": {
              "type": "integer",
              "minimum": 0
            },
            "heapTotal": {
              "type": "integer",
              "minimum": 0
            },
            "heapUsed": {
              "type": "integer",
              "minimum": 0
            },
            "external": {
              "type": "integer",
              "minimum": 0
            },
            "arrayBuffers": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "rss",
            "heapTotal",
            "heapUsed",
            "external",
            "arrayBuffers"
          ]
        },
        "cpuMicroseconds": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "user": {
              "type": "integer",
              "minimum": 0
            },
            "system": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "user",
            "system"
          ]
        }
      },
      "required": [
        "memory",
        "cpuMicroseconds"
      ]
    },
    "host": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "logicalCpus": {
          "type": "integer",
          "minimum": 0
        },
        "totalMemoryBytes": {
          "type": "integer",
          "minimum": 0
        },
        "freeMemoryBytes": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "logicalCpus",
        "totalMemoryBytes",
        "freeMemoryBytes"
      ]
    },
    "disk": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "scope": {
              "const": "application-working-directory"
            },
            "availableBytes": {
              "type": "integer",
              "minimum": 0
            },
            "totalBytes": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "scope",
            "availableBytes",
            "totalBytes"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "interpretation": {
      "type": "string"
    },
    "exports": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "stores",
        "truncated"
      ],
      "properties": {
        "stores": {
          "type": "array",
          "maxItems": 64,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "records",
              "ready",
              "expired",
              "bytes",
              "maxReady",
              "maxFileBytes",
              "maxRecords",
              "ttlMs"
            ],
            "properties": {
              "records": {
                "type": "integer",
                "minimum": 0
              },
              "ready": {
                "type": "integer",
                "minimum": 0
              },
              "expired": {
                "type": "integer",
                "minimum": 0
              },
              "bytes": {
                "type": "integer",
                "minimum": 0
              },
              "maxReady": {
                "type": "integer",
                "minimum": 0
              },
              "maxFileBytes": {
                "type": "integer",
                "minimum": 0
              },
              "maxRecords": {
                "type": "integer",
                "minimum": 0
              },
              "ttlMs": {
                "type": "integer",
                "minimum": 0
              }
            }
          }
        },
        "truncated": {
          "type": "boolean"
        }
      }
    }
  },
  "required": [
    "observedAt",
    "scope",
    "uptimeSeconds",
    "metrics",
    "pool",
    "process",
    "host",
    "disk",
    "interpretation",
    "exports"
  ]
}
```

### DiagnosticsTrace

[Canonical definition](../../contracts/diagnostics.schema.json#/$defs/Trace)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "action": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "action_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation_id": {
          "type": "string"
        },
        "business_status": {
          "enum": [
            "pending",
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "received_at": {
          "type": "string",
          "format": "date-time"
        },
        "accepted_at": {
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
        "action_id",
        "operation_id",
        "business_status",
        "received_at",
        "accepted_at"
      ]
    },
    "events": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "event_id": {
            "type": "string"
          },
          "aggregate_type": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "aggregate_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "recipient_id": {
            "type": "string"
          },
          "recipient_sequence": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "status": {
            "anyOf": [
              {
                "enum": [
                  "pending",
                  "sending",
                  "failed",
                  "received"
                ]
              },
              {
                "type": "null"
              }
            ]
          },
          "attempts": {
            "anyOf": [
              {
                "type": "integer",
                "minimum": 0
              },
              {
                "type": "null"
              }
            ]
          },
          "next_attempt_at": {
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
          "lease_until": {
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
          "received_at": {
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
          "reported_at": {
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
          "applied_through": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "receiver_pending": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "required": [
          "event_id",
          "aggregate_type",
          "aggregate_id",
          "recipient_id",
          "recipient_sequence",
          "status",
          "attempts",
          "next_attempt_at",
          "lease_until",
          "received_at",
          "reported_at",
          "applied_through",
          "receiver_pending"
        ]
      }
    },
    "truncated": {
      "type": "boolean"
    },
    "interpretation": {
      "type": "string"
    }
  },
  "required": [
    "action",
    "events",
    "truncated",
    "interpretation"
  ]
}
```

### ReportFilters

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Filters)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "roundId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
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
    "branchId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "outcome": {
      "anyOf": [
        {
          "enum": [
            "full",
            "partial",
            "refused",
            "no-answer",
            "unfinished",
            "deferred"
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "roundId",
    "driverId",
    "branchId",
    "outcome"
  ]
}
```

### ReportCounts

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Counts)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "shipments": {
      "type": "integer",
      "minimum": 0
    },
    "attempts": {
      "type": "integer",
      "minimum": 0
    },
    "processedAttempts": {
      "type": "integer",
      "minimum": 0
    },
    "failedAttempts": {
      "type": "integer",
      "minimum": 0
    },
    "deferredAttempts": {
      "type": "integer",
      "minimum": 0
    },
    "processedShipments": {
      "type": "integer",
      "minimum": 0
    },
    "fullShipments": {
      "type": "integer",
      "minimum": 0
    },
    "partialShipments": {
      "type": "integer",
      "minimum": 0
    },
    "refusedShipments": {
      "type": "integer",
      "minimum": 0
    },
    "noAnswerShipments": {
      "type": "integer",
      "minimum": 0
    },
    "unfinishedShipments": {
      "type": "integer",
      "minimum": 0
    },
    "deferredShipments": {
      "type": "integer",
      "minimum": 0
    },
    "fullDeliveryPercent": {
      "anyOf": [
        {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "shipments",
    "attempts",
    "processedAttempts",
    "failedAttempts",
    "deferredAttempts",
    "processedShipments",
    "fullShipments",
    "partialShipments",
    "refusedShipments",
    "noAnswerShipments",
    "unfinishedShipments",
    "deferredShipments",
    "fullDeliveryPercent"
  ]
}
```

### ReportCollection

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Collection)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "currency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$"
    },
    "exponent": {
      "type": "integer",
      "minimum": 0,
      "maximum": 6
    },
    "reportedMinor": {
      "type": "string",
      "pattern": "^[0-9]+$"
    },
    "goodsMinor": {
      "type": "string",
      "pattern": "^[0-9]+$"
    },
    "shippingMinor": {
      "type": "string",
      "pattern": "^[0-9]+$"
    },
    "unpaidShippingMinor": {
      "type": "string",
      "pattern": "^[0-9]+$"
    },
    "unreportedAttempts": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
    "currency",
    "exponent",
    "reportedMinor",
    "goodsMinor",
    "shippingMinor",
    "unpaidShippingMinor",
    "unreportedAttempts"
  ]
}
```

### ReportPieces

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Pieces)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "dispatched": {
      "type": "integer",
      "minimum": 0
    },
    "delivered": {
      "type": "integer",
      "minimum": 0
    },
    "held": {
      "type": "integer",
      "minimum": 0
    },
    "returnRequired": {
      "type": "integer",
      "minimum": 0
    },
    "received": {
      "type": "integer",
      "minimum": 0
    },
    "lost": {
      "type": "integer",
      "minimum": 0
    },
    "damaged": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
    "dispatched",
    "delivered",
    "held",
    "returnRequired",
    "received",
    "lost",
    "damaged"
  ]
}
```

### ReportReturn

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Return)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "transitionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "kind": {
      "enum": [
        "received",
        "lost",
        "damaged"
      ]
    },
    "sourceLineId": {
      "type": "string"
    },
    "quantity": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
    "transitionId",
    "kind",
    "sourceLineId",
    "quantity"
  ]
}
```

### ReportTime

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Time)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "status": {
      "enum": [
        "available",
        "missing",
        "uncertain"
      ]
    },
    "observedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "recordedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "actionId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "clock": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/ClockEvidence"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "status",
    "observedAt",
    "recordedAt",
    "actionId",
    "clock"
  ],
  "allOf": [
    {
      "if": {
        "properties": {
          "status": {
            "const": "missing"
          }
        },
        "required": [
          "status"
        ]
      },
      "then": {
        "properties": {
          "observedAt": {
            "type": "null"
          }
        }
      },
      "else": {
        "properties": {
          "observedAt": {
            "$ref": "./common.schema.json#/$defs/UtcInstant"
          }
        }
      }
    }
  ]
}
```

### ReportMeasurement

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Measurement)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "seconds": {
      "anyOf": [
        {
          "type": "number"
        },
        {
          "type": "null"
        }
      ]
    },
    "reason": {
      "anyOf": [
        {
          "enum": [
            "missing-boundary",
            "uncertain-clock",
            "clock-order",
            "different-device",
            "interrupted",
            "changed-workload",
            "unfinished",
            "scoped-view",
            "endpoint-unobserved",
            "forecast-unavailable",
            "identity-changed",
            "identity-unavailable"
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "seconds",
    "reason"
  ],
  "oneOf": [
    {
      "properties": {
        "seconds": {
          "type": "null"
        },
        "reason": {
          "type": "string"
        }
      }
    },
    {
      "properties": {
        "seconds": {
          "type": "number"
        },
        "reason": {
          "type": "null"
        }
      }
    }
  ]
}
```

### ReportForecastStop

[Canonical definition](../../contracts/reporting.schema.json#/$defs/ForecastStop)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "forecastId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "workloadId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "planRevision": {
      "type": "integer",
      "minimum": 1
    },
    "capturedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "membership": {
      "enum": [
        "assigned",
        "manual",
        "unassigned",
        "excluded",
        "paused"
      ]
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 0
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0
    },
    "pinRevision": {
      "type": "integer",
      "minimum": 0
    },
    "expectedArrivalAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedCompletionAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "identityMatches": {
      "type": "boolean"
    }
  },
  "required": [
    "forecastId",
    "workloadId",
    "planRevision",
    "capturedAt",
    "membership",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "expectedArrivalAt",
    "expectedCompletionAt",
    "identityMatches"
  ]
}
```

### ReportAttempt

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Attempt)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "branchId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "recipientName": {
      "type": "string"
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 0
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0
    },
    "pinRevision": {
      "type": "integer",
      "minimum": 0
    },
    "admittedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "outcome": {
      "anyOf": [
        {
          "$ref": "./outcomes.schema.json#/$defs/Record"
        },
        {
          "type": "null"
        }
      ]
    },
    "history": {
      "type": "array",
      "items": {
        "$ref": "./outcomes.schema.json#/$defs/Record"
      }
    },
    "corrections": {
      "type": "array",
      "items": {
        "$ref": "./corrections.schema.json#/$defs/Record"
      }
    },
    "deferred": {
      "type": "boolean"
    },
    "returns": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Return"
      }
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "roundId",
    "dispatchCycleId",
    "branchId",
    "recipientName",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "admittedAt",
    "outcome",
    "history",
    "corrections",
    "deferred",
    "returns"
  ]
}
```

### ReportStopTiming

[Canonical definition](../../contracts/reporting.schema.json#/$defs/StopTiming)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "baseline": {
      "anyOf": [
        {
          "$ref": "#/$defs/ForecastStop"
        },
        {
          "type": "null"
        }
      ]
    },
    "latest": {
      "anyOf": [
        {
          "$ref": "#/$defs/ForecastStop"
        },
        {
          "type": "null"
        }
      ]
    },
    "revisions": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/ForecastStop"
      }
    },
    "heading": {
      "$ref": "#/$defs/Time"
    },
    "arrival": {
      "$ref": "#/$defs/Time"
    },
    "completion": {
      "$ref": "#/$defs/Time"
    },
    "travel": {
      "$ref": "#/$defs/Measurement"
    },
    "service": {
      "$ref": "#/$defs/Measurement"
    },
    "baselineArrivalDifference": {
      "$ref": "#/$defs/Measurement"
    },
    "baselineCompletionDifference": {
      "$ref": "#/$defs/Measurement"
    },
    "latestArrivalDifference": {
      "$ref": "#/$defs/Measurement"
    },
    "latestCompletionDifference": {
      "$ref": "#/$defs/Measurement"
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "baseline",
    "latest",
    "revisions",
    "heading",
    "arrival",
    "completion",
    "travel",
    "service",
    "baselineArrivalDifference",
    "baselineCompletionDifference",
    "latestArrivalDifference",
    "latestCompletionDifference"
  ]
}
```

### ReportForecast

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Forecast)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "planId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "forecastId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "workloadId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "planRevision": {
      "type": "integer",
      "minimum": 1
    },
    "capturedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "timeOrigin": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "expectedFinishAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "customerAttempts": {
      "type": "integer",
      "minimum": 0
    },
    "branchStops": {
      "type": "integer",
      "minimum": 0
    },
    "endpoint": {
      "enum": [
        "last-customer",
        "fixed",
        "branch"
      ]
    },
    "kind": {
      "enum": [
        "ready",
        "manual",
        "partial",
        "branch"
      ]
    }
  },
  "required": [
    "planId",
    "forecastId",
    "workloadId",
    "planRevision",
    "capturedAt",
    "timeOrigin",
    "expectedFinishAt",
    "customerAttempts",
    "branchStops",
    "endpoint",
    "kind"
  ]
}
```

### ReportBranchVisit

[Canonical definition](../../contracts/reporting.schema.json#/$defs/BranchVisit)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "segmentId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "branchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "stage": {
      "type": "string"
    },
    "serviceEstimateSeconds": {
      "type": "integer",
      "minimum": 0
    },
    "heading": {
      "$ref": "#/$defs/Time"
    },
    "arrival": {
      "$ref": "#/$defs/Time"
    },
    "completion": {
      "$ref": "#/$defs/Time"
    },
    "travel": {
      "$ref": "#/$defs/Measurement"
    },
    "service": {
      "$ref": "#/$defs/Measurement"
    }
  },
  "required": [
    "segmentId",
    "branchId",
    "stage",
    "serviceEstimateSeconds",
    "heading",
    "arrival",
    "completion",
    "travel",
    "service"
  ]
}
```

### ReportRoundTiming

[Canonical definition](../../contracts/reporting.schema.json#/$defs/RoundTiming)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "visibility": {
      "enum": [
        "whole-round",
        "authorized-subset"
      ]
    },
    "acceptedStartAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "acceptedEndAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "start": {
      "$ref": "#/$defs/Time"
    },
    "end": {
      "$ref": "#/$defs/Time"
    },
    "baseline": {
      "anyOf": [
        {
          "$ref": "#/$defs/Forecast"
        },
        {
          "type": "null"
        }
      ]
    },
    "latest": {
      "anyOf": [
        {
          "$ref": "#/$defs/Forecast"
        },
        {
          "type": "null"
        }
      ]
    },
    "revisions": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Forecast"
      }
    },
    "scopeChanged": {
      "type": "boolean"
    },
    "interrupted": {
      "type": "boolean"
    },
    "unfinishedAttempts": {
      "type": "integer",
      "minimum": 0
    },
    "closure": {
      "enum": [
        "open",
        "ended-unfinished",
        "ended-resolved",
        "scoped-view"
      ]
    },
    "baselineFinishDifference": {
      "$ref": "#/$defs/Measurement"
    },
    "latestFinishDifference": {
      "$ref": "#/$defs/Measurement"
    },
    "elapsed": {
      "$ref": "#/$defs/Measurement"
    },
    "stops": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/StopTiming"
      }
    },
    "branchVisits": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/BranchVisit"
      }
    }
  },
  "required": [
    "roundId",
    "workdayId",
    "visibility",
    "acceptedStartAt",
    "acceptedEndAt",
    "start",
    "end",
    "baseline",
    "latest",
    "revisions",
    "scopeChanged",
    "interrupted",
    "unfinishedAttempts",
    "closure",
    "baselineFinishDifference",
    "latestFinishDifference",
    "elapsed",
    "stops",
    "branchVisits"
  ]
}
```

### ReportRound

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Round)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "startedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "endedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "roundId",
    "startedAt",
    "endedAt"
  ]
}
```

### ReportWorkday

[Canonical definition](../../contracts/reporting.schema.json#/$defs/Workday)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "definitionVersion": {
      "const": "1.0.0"
    },
    "snapshotId": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "asOf": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "displayTimeZone": {
      "const": "Africa/Cairo"
    },
    "acceptedOnly": {
      "const": true
    },
    "pendingLocalActions": {
      "const": "not-known-to-server"
    },
    "filters": {
      "$ref": "#/$defs/Filters"
    },
    "workdayId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "openedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "endedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "scopeCounts": {
      "$ref": "#/$defs/Counts"
    },
    "counts": {
      "$ref": "#/$defs/Counts"
    },
    "collections": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Collection"
      }
    },
    "pieces": {
      "anyOf": [
        {
          "$ref": "#/$defs/Pieces"
        },
        {
          "type": "null"
        }
      ]
    },
    "rounds": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Round"
      }
    },
    "attempts": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Attempt"
      }
    },
    "timing": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/RoundTiming"
      }
    }
  },
  "required": [
    "definitionVersion",
    "snapshotId",
    "asOf",
    "displayTimeZone",
    "acceptedOnly",
    "pendingLocalActions",
    "filters",
    "workdayId",
    "driverId",
    "openedAt",
    "endedAt",
    "scopeCounts",
    "counts",
    "collections",
    "pieces",
    "rounds",
    "attempts",
    "timing"
  ]
}
```

### ReportDayList

[Canonical definition](../../contracts/reporting.schema.json#/$defs/DayList)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "workdayId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "driverId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "openedAt": {
            "$ref": "./common.schema.json#/$defs/UtcInstant"
          },
          "endedAt": {
            "anyOf": [
              {
                "$ref": "./common.schema.json#/$defs/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "driverLabel": {
            "type": "string"
          }
        },
        "required": [
          "workdayId",
          "driverId",
          "openedAt",
          "endedAt",
          "driverLabel"
        ]
      }
    },
    "nextBefore": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "branches": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "branchId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "label": {
            "type": "string"
          }
        },
        "required": [
          "branchId",
          "label"
        ]
      }
    }
  },
  "required": [
    "items",
    "nextBefore",
    "branches"
  ]
}
```

### ReportTimingSnapshot

[Canonical definition](../../contracts/reporting.schema.json#/$defs/TimingSnapshot)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "snapshotId": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "asOf": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "displayTimeZone": {
      "const": "Africa/Cairo"
    },
    "filters": {
      "$ref": "#/$defs/Filters"
    },
    "timing": {
      "$ref": "#/$defs/RoundTiming"
    }
  },
  "required": [
    "snapshotId",
    "asOf",
    "displayTimeZone",
    "filters",
    "timing"
  ]
}
```

### ReportExportRequest

[Canonical definition](../../contracts/report-export.schema.json#/$defs/Request)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "snapshotId": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "filters": {
      "$ref": "#/$defs/Filters"
    }
  },
  "required": [
    "snapshotId"
  ]
}
```

### ReportExportStatus

[Canonical definition](../../contracts/report-export.schema.json#/$defs/Status)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "exportId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "status": {
      "enum": [
        "ready",
        "expired"
      ]
    },
    "snapshotId": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "createdAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "expiresAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "fileName": {
      "type": "string",
      "pattern": "^tawsel-workday-[0-9a-f]{8}-[0-9a-f]{8}\\.xlsx$"
    },
    "bytes": {
      "type": "integer",
      "minimum": 1,
      "maximum": 4194304
    },
    "downloadUrl": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^/api/v1/report-exports/[0-9a-f-]{36}/download\\?kind=(personal|company)$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "exportId",
    "status",
    "snapshotId",
    "createdAt",
    "expiresAt",
    "fileName",
    "bytes",
    "downloadUrl"
  ]
}
```

### SyncBatch

[Canonical definition](../../contracts/sync.schema.json#/$defs/Batch)

```json
{
  "type": "object",
  "properties": {
    "actions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "$ref": "action-envelope.v1.schema.json"
      }
    }
  },
  "required": [
    "actions"
  ],
  "additionalProperties": false
}
```

### SyncEntry

[Canonical definition](../../contracts/sync.schema.json#/$defs/Entry)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "received"
        },
        "result": {
          "$ref": "action-result.v1.schema.json"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "waiting"
        },
        "dependencies": {
          "type": "array",
          "items": {
            "$ref": "common.schema.json#/$defs/Uuid"
          }
        }
      },
      "required": [
        "actionId",
        "status",
        "dependencies"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "not-received"
        },
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        }
      },
      "required": [
        "actionId",
        "status",
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  ]
}
```

### SyncBatchResult

[Canonical definition](../../contracts/sync.schema.json#/$defs/BatchResult)

```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "$ref": "#/$defs/Entry"
      }
    }
  },
  "required": [
    "results"
  ],
  "additionalProperties": false
}
```

### SyncConflicts

[Canonical definition](../../contracts/sync.schema.json#/$defs/Conflicts)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "$ref": "device-ownership.schema.json#/$defs/Evidence"
      }
    },
    "nextActionId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "items",
    "nextActionId"
  ],
  "additionalProperties": false
}
```

### SourceStatus

[Canonical definition](../../contracts/source.schema.json#/$defs/Status)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "tenantId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "integrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "commands": {
      "type": "array",
      "maxItems": 200,
      "items": {
        "$ref": "#/$defs/Command"
      }
    },
    "records": {
      "type": "array",
      "maxItems": 200,
      "items": {
        "$ref": "#/$defs/Record"
      }
    },
    "truncated": {
      "type": "boolean"
    }
  },
  "required": [
    "schemaVersion",
    "tenantId",
    "integrationId",
    "commands",
    "records",
    "truncated"
  ]
}
```

### ConsumerProblem

[Canonical definition](../../contracts/consumer.schema.json#/$defs/Problem)

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "format": "uri"
    },
    "title": {
      "type": "string"
    },
    "status": {
      "type": "integer",
      "minimum": 400,
      "maximum": 599
    },
    "code": {
      "type": "string",
      "enum": [
        "unsupported_event",
        "event_identity_mismatch",
        "payload_mismatch",
        "sequence_collision",
        "invalid_signature",
        "invalid_json",
        "unauthenticated",
        "stream_unavailable",
        "invalid_query",
        "receiver_unavailable"
      ]
    },
    "correlationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
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
  "additionalProperties": false
}
```

### ConsumerAggregate

[Canonical definition](../../contracts/consumer.schema.json#/$defs/Aggregate)

```json
{
  "type": "object",
  "properties": {
    "type": {
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
      "$ref": "./common.schema.json#/$defs/Uuid"
    }
  },
  "required": [
    "type",
    "id"
  ],
  "additionalProperties": false
}
```

### ConsumerState

[Canonical definition](../../contracts/consumer.schema.json#/$defs/State)

```json
{
  "type": "object",
  "properties": {
    "task": {
      "anyOf": [
        {
          "$ref": "./b2b-intake.schema.json#/$defs/Task"
        },
        {
          "type": "null"
        }
      ]
    },
    "outcomes": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "$ref": "./outcomes.schema.json#/$defs/Record"
      }
    },
    "returnRequest": {
      "anyOf": [
        {
          "$ref": "./returns.schema.json#/$defs/RequestView"
        },
        {
          "type": "null"
        }
      ]
    },
    "returnItems": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "type": "object",
        "properties": {
          "itemId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "taskId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "sourceLineId": {
            "$ref": "./common.schema.json#/$defs/ExternalId"
          },
          "requested": {
            "$ref": "./common.schema.json#/$defs/PieceCount"
          },
          "received": {
            "$ref": "./common.schema.json#/$defs/PieceCount"
          },
          "lost": {
            "$ref": "./common.schema.json#/$defs/PieceCount"
          },
          "damaged": {
            "$ref": "./common.schema.json#/$defs/PieceCount"
          },
          "unresolved": {
            "$ref": "./common.schema.json#/$defs/PieceCount"
          }
        },
        "required": [
          "itemId",
          "taskId",
          "sourceLineId",
          "requested",
          "received",
          "lost",
          "damaged",
          "unresolved"
        ],
        "additionalProperties": false
      }
    },
    "notices": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "maxLength": 256
          },
          "event": {
            "$ref": "./events/sender-event.v1.schema.json"
          }
        },
        "required": [
          "key",
          "event"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "task",
    "outcomes",
    "returnRequest",
    "returnItems",
    "notices"
  ],
  "additionalProperties": false
}
```

### ConsumerCheckpoint

[Canonical definition](../../contracts/consumer.schema.json#/$defs/Checkpoint)

```json
{
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "tenantId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "recipientIntegrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "aggregate": {
      "type": "object",
      "properties": {
        "type": {
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
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "type",
        "id"
      ],
      "additionalProperties": false
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "receivedThrough": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "receivedHigh": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "appliedThrough": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "projectedThrough": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "snapshotThrough": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "historyComplete": {
      "type": "boolean"
    },
    "pendingCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
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
    "appliedAt": {
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
      "anyOf": [
        {
          "enum": [
            "sequence_gap",
            "dependency_missing",
            "projection_failed",
            "projection_limit",
            "history_unavailable"
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "schemaVersion",
    "tenantId",
    "recipientIntegrationId",
    "aggregate",
    "revision",
    "receivedThrough",
    "receivedHigh",
    "appliedThrough",
    "projectedThrough",
    "snapshotThrough",
    "historyComplete",
    "pendingCount",
    "receivedAt",
    "appliedAt",
    "lastError"
  ],
  "additionalProperties": false
}
```

### ConsumerStatus

[Canonical definition](../../contracts/consumer.schema.json#/$defs/Status)

```json
{
  "type": "object",
  "properties": {
    "checkpoint": {
      "$ref": "#/$defs/Checkpoint"
    },
    "state": {
      "anyOf": [
        {
          "$ref": "#/$defs/State"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "checkpoint",
    "state"
  ],
  "additionalProperties": false
}
```

### ConsumerSnapshot

[Canonical definition](../../contracts/consumer.schema.json#/$defs/Snapshot)

```json
{
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "tenantId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "recipientIntegrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "aggregate": {
      "type": "object",
      "properties": {
        "type": {
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
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      },
      "required": [
        "type",
        "id"
      ],
      "additionalProperties": false
    },
    "throughSequence": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "capturedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "state": {
      "$ref": "#/$defs/State"
    },
    "history": {
      "const": "current-state-only"
    },
    "retention": {
      "const": "indefinite-no-purge"
    }
  },
  "required": [
    "schemaVersion",
    "tenantId",
    "recipientIntegrationId",
    "aggregate",
    "throughSequence",
    "capturedAt",
    "state",
    "history",
    "retention"
  ],
  "additionalProperties": false
}
```

### ConsumerReportCommand

[Canonical definition](../../contracts/consumer.schema.json#/$defs/ReportCommand)

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
      "const": "integration.reportAppliedCheckpoint"
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
      "$ref": "#/$defs/Checkpoint"
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

### ConsumerReport

[Canonical definition](../../contracts/consumer.schema.json#/$defs/Report)

```json
{
  "type": "object",
  "properties": {
    "checkpoint": {
      "$ref": "#/$defs/Checkpoint"
    },
    "reportedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "evidence": {
      "const": "receiver-reported"
    }
  },
  "required": [
    "checkpoint",
    "reportedAt",
    "evidence"
  ],
  "additionalProperties": false
}
```

### ConsumerReportRead

[Canonical definition](../../contracts/consumer.schema.json#/$defs/ReportRead)

```json
{
  "type": "object",
  "properties": {
    "report": {
      "anyOf": [
        {
          "$ref": "#/$defs/Report"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "report"
  ],
  "additionalProperties": false
}
```

### OutboxConfigureWebhook

[Canonical definition](../../contracts/outbox.schema.json#/$defs/ConfigureWebhook)

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "format": "uri",
      "maxLength": 2048
    },
    "enabled": {
      "type": "boolean"
    },
    "expectedRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "url",
    "enabled",
    "expectedRevision"
  ],
  "additionalProperties": false
}
```

### OutboxRotateSigningKey

[Canonical definition](../../contracts/outbox.schema.json#/$defs/RotateSigningKey)

```json
{
  "type": "object",
  "properties": {
    "keyId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]{1,64}$"
    },
    "overlapSeconds": {
      "type": "integer",
      "minimum": 300,
      "maximum": 86400
    }
  },
  "required": [
    "keyId",
    "overlapSeconds"
  ],
  "additionalProperties": false
}
```

### OutboxRetryDelivery

[Canonical definition](../../contracts/outbox.schema.json#/$defs/RetryDelivery)

```json
{
  "type": "object",
  "properties": {
    "eventId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    }
  },
  "required": [
    "eventId"
  ],
  "additionalProperties": false
}
```

### OutboxConfiguration

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Configuration)

```json
{
  "type": "object",
  "properties": {
    "revision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "enabled": {
      "type": "boolean"
    },
    "url": {
      "type": "string",
      "format": "uri"
    }
  },
  "required": [
    "revision",
    "enabled",
    "url"
  ],
  "additionalProperties": false
}
```

### OutboxKeyRotation

[Canonical definition](../../contracts/outbox.schema.json#/$defs/KeyRotation)

```json
{
  "type": "object",
  "properties": {
    "keyId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]{1,64}$"
    },
    "activatedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "previousKeyId": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]{1,64}$"
        },
        {
          "type": "null"
        }
      ]
    },
    "verifyUntil": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "keyId",
    "activatedAt",
    "previousKeyId",
    "verifyUntil"
  ],
  "additionalProperties": false
}
```

### OutboxRetryResult

[Canonical definition](../../contracts/outbox.schema.json#/$defs/RetryResult)

```json
{
  "type": "object",
  "properties": {
    "eventId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "scheduled": {
      "type": "boolean"
    }
  },
  "required": [
    "eventId",
    "scheduled"
  ],
  "additionalProperties": false
}
```

### OutboxAcknowledgement

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Acknowledgement)

```json
{
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "tenantId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "recipientIntegrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "eventId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "acknowledgement": {
      "const": "received"
    }
  },
  "required": [
    "schemaVersion",
    "tenantId",
    "recipientIntegrationId",
    "eventId",
    "acknowledgement"
  ],
  "additionalProperties": false
}
```

### OutboxAttempt

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Attempt)

```json
{
  "type": "object",
  "properties": {
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "number": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "startedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "finishedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "keyId": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]{1,64}$"
        },
        {
          "type": "null"
        }
      ]
    },
    "deliveryTimestamp": {
      "type": "string",
      "pattern": "^\\d{13}$"
    },
    "result": {
      "enum": [
        "sending",
        "received",
        "failed",
        "lease-expired"
      ]
    },
    "errorCode": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "httpStatus": {
      "anyOf": [
        {
          "type": "integer",
          "minimum": 100,
          "maximum": 599
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "attemptId",
    "number",
    "startedAt",
    "finishedAt",
    "keyId",
    "deliveryTimestamp",
    "result",
    "errorCode",
    "httpStatus"
  ],
  "additionalProperties": false
}
```

### OutboxDelivery

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Delivery)

```json
{
  "type": "object",
  "properties": {
    "eventId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "eventType": {
      "$ref": "./common.schema.json#/$defs/OperationId"
    },
    "aggregate": {
      "$ref": "./events/envelope.v1.schema.json#/properties/aggregate"
    },
    "createdAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "status": {
      "enum": [
        "pending",
        "sending",
        "failed",
        "received"
      ]
    },
    "attempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "nextAttemptAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "leaseUntil": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
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
    "lastError": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "projectionStatus": {
      "const": "unknown"
    },
    "blockedBy": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "eventId",
    "eventType",
    "aggregate",
    "createdAt",
    "status",
    "attempts",
    "nextAttemptAt",
    "leaseUntil",
    "receivedAt",
    "lastError",
    "projectionStatus",
    "blockedBy"
  ],
  "additionalProperties": false
}
```

### OutboxQueue

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Queue)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "$ref": "#/$defs/Delivery"
      }
    },
    "nextCursor": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "counts": {
      "type": "object",
      "properties": {
        "pending": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "sending": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "failed": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "received": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "pending",
        "sending",
        "failed",
        "received"
      ],
      "additionalProperties": false
    },
    "oldestUnreceivedAt": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "projectionStatus": {
      "const": "unknown"
    }
  },
  "required": [
    "items",
    "nextCursor",
    "counts",
    "oldestUnreceivedAt",
    "projectionStatus"
  ],
  "additionalProperties": false
}
```

### OutboxDetail

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Detail)

```json
{
  "type": "object",
  "properties": {
    "delivery": {
      "$ref": "#/$defs/Delivery"
    },
    "attempts": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "$ref": "#/$defs/Attempt"
      }
    },
    "nextAttemptBefore": {
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
    }
  },
  "required": [
    "delivery",
    "attempts",
    "nextAttemptBefore"
  ],
  "additionalProperties": false
}
```

### OutboxReplay

[Canonical definition](../../contracts/outbox.schema.json#/$defs/Replay)

```json
{
  "type": "object",
  "properties": {
    "events": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "$ref": "./events/sender-event.v1.schema.json"
      }
    },
    "nextAfterSequence": {
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
    "retention": {
      "const": "indefinite-no-purge"
    },
    "projectionStatus": {
      "const": "unknown"
    }
  },
  "required": [
    "events",
    "nextAfterSequence",
    "retention",
    "projectionStatus"
  ],
  "additionalProperties": false
}
```

### OutboxConfigureWebhookCommand

[Canonical definition](../../contracts/outbox.schema.json#/$defs/ConfigureWebhookCommand)

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
      "const": "integration.configureWebhook"
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
      "$ref": "#/$defs/ConfigureWebhook"
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

### OutboxRotateSigningKeyCommand

[Canonical definition](../../contracts/outbox.schema.json#/$defs/RotateSigningKeyCommand)

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
      "const": "integration.rotateSigningKey"
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
      "$ref": "#/$defs/RotateSigningKey"
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

### OutboxRetryDeliveryCommand

[Canonical definition](../../contracts/outbox.schema.json#/$defs/RetryDeliveryCommand)

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
      "const": "integration.retryDelivery"
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
      "$ref": "#/$defs/RetryDelivery"
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

### SenderEvent

[Canonical definition](../../contracts/events/sender-event.v1.schema.json)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/events/sender-event.v1.schema.json",
  "title": "P25 emitted integration events v1",
  "allOf": [
    {
      "$ref": "./envelope.v1.schema.json"
    }
  ],
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "provisioning.changed"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../provisioning.schema.json#/$defs/ProvisioningChanged"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.snapshotAccepted"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.prepared"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.received"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.withdrawn"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "assignment.reassigned"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.urgencyChanged"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "dispatch.createdFromReceipt"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../b2b-intake.schema.json#/$defs/ChangedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "location.pinConfirmed"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../location.schema.json#/$defs/ConfirmedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "plan.revisionPublished"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../planning.schema.json#/$defs/PublishedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "round.started"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../round-start.schema.json#/$defs/StartedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "current.headingSelected"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../current-activity.schema.json#/$defs/HeadingEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "current.arrivalRecorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../current-activity.schema.json#/$defs/ArrivalEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "outcome.recorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../outcomes.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.deferred"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.retryAdmitted"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.deferredActivated"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "task.driverUrgencyChanged"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../eligibility.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "round.ended"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../workday-closure.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "workday.ended"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../workday-closure.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "return.requested"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../returns.schema.json#/$defs/RequestedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "return.subsetReceived"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../returns.schema.json#/$defs/ReceivedEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "return.dispositionRecorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../returns.schema.json#/$defs/DispositionEvent"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "branch.roundInterrupted"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../branch-activity.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "branch.arrivalRecorded"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../branch-activity.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "branch.roundResumed"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../branch-activity.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    },
    {
      "type": "object",
      "properties": {
        "eventType": {
          "const": "outcome.corrected"
        },
        "eventKind": {
          "const": "transition"
        },
        "payloadVersion": {
          "const": "1.0.0"
        },
        "payload": {
          "$ref": "../corrections.schema.json#/$defs/Event"
        }
      },
      "required": [
        "eventType",
        "eventKind",
        "payloadVersion",
        "payload"
      ]
    }
  ]
}
```

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

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/Context)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "owner": {
      "type": "object",
      "properties": {
        "accountId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "generation": {
          "$ref": "common.schema.json#/$defs/Generation"
        }
      },
      "required": [
        "accountId",
        "deviceId",
        "generation"
      ],
      "additionalProperties": false
    },
    "viewerDeviceId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "mode": {
      "enum": [
        "owner",
        "view-only"
      ]
    },
    "roundState": {
      "enum": [
        "active",
        "ended"
      ]
    },
    "workdayState": {
      "enum": [
        "open",
        "closed"
      ]
    },
    "mayTakeover": {
      "type": "boolean"
    },
    "snapshotRequired": {
      "type": "boolean"
    }
  },
  "required": [
    "roundId",
    "workdayId",
    "driverId",
    "owner",
    "viewerDeviceId",
    "mode",
    "roundState",
    "workdayState",
    "mayTakeover",
    "snapshotRequired"
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
    "wrong_source_branch",
    "quantity_exceeded",
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
    "correction_dependency_conflict",
    "sync_required",
    "sync_incomplete",
    "plan_not_startable",
    "round_already_active"
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

Durable scoped command result. P20 exposes action.getResult for authorized round execution/takeover actions; other families retain their feature adapters. Compacted results preserve identity and never execute again; unresolved evidence is held, full responses last at least 30 days.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.tawsel.invalid/v1/action-result.v1.schema.json",
  "title": "Durable command result v1",
  "description": "Durable scoped command result. P20 exposes action.getResult for authorized round execution/takeover actions; other families retain their feature adapters. Compacted results preserve identity and never execute again; unresolved evidence is held, full responses last at least 30 days.",
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
  "title": "Recipient event envelope v1 — sender implemented; feature catalog defines emitted types",
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
    },
    "expectedAccount": {
      "description": "P35 restriction for same-account OIDC recovery when the old cookie is unavailable. These public identity references confer no authentication or authorization. Callback must match the server-resolved subject and tenant; current access is still required.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "tenantId",
        "accountId"
      ],
      "properties": {
        "tenantId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        "accountId": {
          "$ref": "./common.schema.json#/$defs/Uuid"
        }
      }
    }
  },
  "allOf": [
    {
      "if": {
        "required": [
          "expectedAccount"
        ],
        "properties": {
          "expectedAccount": {}
        }
      },
      "then": {
        "required": [
          "reauthenticate"
        ],
        "properties": {
          "reauthenticate": {
            "const": true
          }
        }
      }
    }
  ]
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
    },
    "returnCapabilities": {
      "type": "array",
      "items": {
        "enum": [
          "return.receive",
          "return.dispose"
        ]
      },
      "uniqueItems": true,
      "description": "Operator-only full replacement of return grants; omitted preserves, [] clears. Separate from intakeCapabilities."
    },
    "monitoringCapabilities": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 1,
      "items": {
        "enum": [
          "monitor.read"
        ]
      },
      "description": "Operator-only replacement of monitoring grants. Omitted preserves; [] revokes. Never permits another source or branch."
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
    },
    "previousDispatchCycleId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "latest": {
      "type": "boolean"
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

### PlanningRoutePolicy

[Canonical definition](../../contracts/planning.schema.json#/$defs/RoutePolicy)

```json
{
  "type": "object",
  "properties": {
    "version": {
      "const": 1
    },
    "method": {
      "enum": [
        "grouped-heuristic",
        "manual",
        "branch-service"
      ]
    },
    "orderedTaskIds": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Uuid"
      },
      "maxItems": 50,
      "uniqueItems": true
    },
    "exceptions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "taskId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "reason": {
            "enum": [
              "unassigned-current",
              "unassigned-urgent",
              "unassigned-ordinary",
              "blocked-by-current"
            ]
          }
        },
        "required": [
          "taskId",
          "reason"
        ],
        "additionalProperties": false
      }
    },
    "branchStop": {
      "type": "object",
      "properties": {
        "segmentId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "branchId": {
          "$ref": "common.schema.json#/$defs/Uuid"
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
        "segmentId",
        "branchId",
        "coordinates",
        "serviceEstimateSeconds"
      ],
      "additionalProperties": false
    },
    "roadRoute": {
      "anyOf": [
        {
          "$ref": "routing.schema.json#/$defs/RouteResult"
        },
        {
          "type": "null"
        }
      ],
      "description": "P33 optional OSRM-validated road geometry for this immutable plan order, captured outside the publication transaction. Null or absent means unavailable (including older/manual plans). It does not establish basemap coverage, movement, arrival or a new forecast."
    }
  },
  "required": [
    "version",
    "method",
    "orderedTaskIds",
    "exceptions"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "method": {
            "const": "branch-service"
          }
        },
        "required": [
          "method"
        ]
      },
      "then": {
        "properties": {
          "orderedTaskIds": {
            "maxItems": 0,
            "type": "array"
          },
          "exceptions": {
            "maxItems": 0,
            "type": "array"
          },
          "branchStop": {
            "type": "object",
            "properties": {
              "segmentId": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "branchId": {
                "$ref": "common.schema.json#/$defs/Uuid"
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
              "segmentId",
              "branchId",
              "coordinates",
              "serviceEstimateSeconds"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "branchStop"
        ]
      },
      "else": {
        "not": {
          "required": [
            "branchStop"
          ],
          "properties": {
            "branchStop": {}
          }
        }
      }
    }
  ]
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

Explicit manual origin, never GPS or physical arrival. plannedStartAt is the eligibility and forecast anchor, not round start. Whole-route policy validates the endpoint.

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
  "description": "Explicit manual origin, never GPS or physical arrival. plannedStartAt is the eligibility and forecast anchor, not round start. Whole-route policy validates the endpoint."
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
          "$ref": "#/$defs/InputSettings"
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
    },
    "physicalOrigin": {
      "anyOf": [
        {
          "$ref": "current-activity.schema.json#/$defs/PhysicalOrigin"
        },
        {
          "type": "null"
        }
      ],
      "description": "Absent or null means no recorded physical correction/arrival. Omitted until evidence exists to preserve unchanged pre-P16 input fingerprints."
    },
    "branchActivity": {
      "$ref": "current-activity.schema.json#/$defs/BranchActivity"
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

Durable calculation state. resultKind distinguishes full, partial, invalid provider/policy response and dependency failure. Historical P13 complete jobs may still point to unvalidated drafts; inspect the plan state. Never implies an active round.

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
            "capacity-exceeded",
            "branch-service"
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
    },
    "resultKind": {
      "anyOf": [
        {
          "enum": [
            "full",
            "partial",
            "invalid",
            "dependency-failed"
          ]
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
  "description": "Durable calculation state. resultKind distinguishes full, partial, invalid provider/policy response and dependency failure. Historical P13 complete jobs may still point to unvalidated drafts; inspect the plan state. Never implies an active round.",
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
        "excluded",
        "manual",
        "paused"
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
        "if": {
          "type": "object",
          "properties": {
            "membership": {
              "enum": [
                "manual",
                "paused"
              ]
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
              "type": "null"
            },
            "expectedCompletionAt": {
              "type": "null"
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

Immutable historical draft, validated ready or explicit partial plan. Only a current valid ready/manual revision may be considered for online start by P15. No baseline is overwritten.

```json
{
  "type": "object",
  "properties": {
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "jobId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
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
      "enum": [
        "draft",
        "ready",
        "partial",
        "manual",
        "branch"
      ]
    },
    "current": {
      "type": "boolean"
    },
    "inputCurrent": {
      "type": "boolean"
    },
    "policyValidated": {
      "type": "boolean"
    },
    "candidate": {
      "anyOf": [
        {
          "$ref": "routing.schema.json#/$defs/OptimizationResult"
        },
        {
          "type": "null"
        }
      ]
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
    },
    "routePolicy": {
      "$ref": "#/$defs/RoutePolicy"
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
  "description": "Immutable historical draft, validated ready or explicit partial plan. Only a current valid ready/manual revision may be considered for online start by P15. No baseline is overwritten.",
  "allOf": [
    {
      "if": {
        "type": "object",
        "properties": {
          "state": {
            "enum": [
              "manual",
              "branch"
            ]
          }
        },
        "required": [
          "state"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "candidate": {
            "type": "null"
          },
          "jobId": {
            "type": "null"
          },
          "forecast": {
            "type": "object",
            "properties": {
              "expectedFinishAt": {
                "type": "null"
              }
            }
          },
          "routePolicy": {
            "type": "object",
            "properties": {
              "method": {
                "enum": [
                  "manual",
                  "branch-service"
                ]
              }
            }
          }
        }
      },
      "else": {
        "type": "object",
        "properties": {
          "candidate": {
            "$ref": "routing.schema.json#/$defs/OptimizationResult"
          },
          "jobId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          }
        },
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
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "state": {
            "enum": [
              "ready",
              "partial",
              "manual",
              "branch"
            ]
          }
        },
        "required": [
          "state"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "policyValidated": {
            "const": true
          },
          "routePolicy": {
            "$ref": "#/$defs/RoutePolicy"
          }
        },
        "required": [
          "routePolicy"
        ]
      },
      "else": {
        "type": "object",
        "properties": {
          "policyValidated": {
            "const": false
          }
        }
      }
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "state": {
            "const": "ready"
          }
        },
        "required": [
          "state"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "candidate": {
            "type": "object",
            "properties": {
              "status": {
                "const": "complete"
              },
              "visits": {
                "type": "array",
                "minItems": 1
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "type": "object",
        "properties": {
          "state": {
            "const": "partial"
          }
        },
        "required": [
          "state"
        ]
      },
      "then": {
        "type": "object",
        "properties": {
          "candidate": {
            "type": "object",
            "properties": {
              "status": {
                "const": "partial"
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "state": {
            "const": "branch"
          }
        },
        "required": [
          "state"
        ]
      },
      "then": {
        "properties": {
          "routePolicy": {
            "properties": {
              "method": {
                "const": "branch-service"
              }
            },
            "type": "object"
          }
        }
      },
      "else": {
        "properties": {
          "routePolicy": {
            "properties": {
              "method": {
                "enum": [
                  "manual",
                  "grouped-heuristic"
                ]
              }
            },
            "type": "object"
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
    },
    "inputRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "manualRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "continuation": {
      "anyOf": [
        {
          "$ref": "#/$defs/Continuation"
        },
        {
          "type": "null"
        }
      ]
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
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
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
      "enum": [
        "draft",
        "ready",
        "partial",
        "manual",
        "branch"
      ]
    },
    "status": {
      "enum": [
        "complete",
        "partial",
        "manual",
        "branch"
      ]
    },
    "policyValidated": {
      "type": "boolean"
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

### PlanningManualOrder

[Canonical definition](../../contracts/planning.schema.json#/$defs/ManualOrder)

An explicit complete eligible manual sequence, or a first suggestion followed by retained/grouped remaining work. Does not assert heading, physical arrival or round start. Current target and urgent order remain constraints. Unknown road metrics and times stay null.

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
    "expectedInputRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedManualRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "selection": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "order"
            },
            "taskIds": {
              "type": "array",
              "items": {
                "$ref": "common.schema.json#/$defs/Uuid"
              },
              "minItems": 1,
              "maxItems": 50,
              "uniqueItems": true
            }
          },
          "required": [
            "kind",
            "taskIds"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "select-first"
            },
            "taskId": {
              "$ref": "common.schema.json#/$defs/Uuid"
            }
          },
          "required": [
            "kind",
            "taskId"
          ],
          "additionalProperties": false
        }
      ]
    }
  },
  "required": [
    "driverId",
    "expectedSettingsRevision",
    "expectedInputRevision",
    "expectedManualRevision",
    "selection"
  ],
  "additionalProperties": false,
  "description": "An explicit complete eligible manual sequence, or a first suggestion followed by retained/grouped remaining work. Does not assert heading, physical arrival or round start. Current target and urgent order remain constraints. Unknown road metrics and times stay null."
}
```

### PlanningManualOrderCommand

[Canonical definition](../../contracts/planning.schema.json#/$defs/ManualOrderCommand)

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
          "const": "planning.setManualOrder"
        },
        "payload": {
          "$ref": "#/$defs/ManualOrder"
        }
      }
    }
  ]
}
```

### PlanningManualResult

[Canonical definition](../../contracts/planning.schema.json#/$defs/ManualResult)

```json
{
  "type": "object",
  "properties": {
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "manualRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "inputRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "planId",
    "revision",
    "manualRevision",
    "inputRevision"
  ],
  "additionalProperties": false
}
```

### PlanningContinuation

[Canonical definition](../../contracts/planning.schema.json#/$defs/Continuation)

```json
{
  "type": "object",
  "properties": {
    "sourcePlanId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "orderedTaskIds": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Uuid"
      },
      "minItems": 1,
      "maxItems": 50,
      "uniqueItems": true
    },
    "mode": {
      "const": "reoptimization-pending"
    },
    "requiresManualConfirmation": {
      "const": true
    },
    "roadMetricsAvailable": {
      "const": false
    }
  },
  "required": [
    "sourcePlanId",
    "orderedTaskIds",
    "mode",
    "requiresManualConfirmation",
    "roadMetricsAvailable"
  ],
  "additionalProperties": false
}
```

### RoundReadinessRequest

[Canonical definition](../../contracts/round-start.schema.json#/$defs/ReadinessRequest)

Online preparation verifies each relevant action is durably accepted in the authenticated account, and reads fresh authorized planning input. P34 supplies the complete local journal barrier; omitted unsent actions cannot be discovered by the server. No alreadySynced flag.

```json
{
  "type": "object",
  "properties": {
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "deviceId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedPlanRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "relevantActionIds": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Uuid"
      },
      "uniqueItems": true,
      "maxItems": 1000
    }
  },
  "required": [
    "driverId",
    "deviceId",
    "planId",
    "expectedPlanRevision",
    "relevantActionIds"
  ],
  "additionalProperties": false,
  "description": "Online preparation verifies each relevant action is durably accepted in the authenticated account, and reads fresh authorized planning input. P34 supplies the complete local journal barrier; omitted unsent actions cannot be discovered by the server. No alreadySynced flag."
}
```

### RoundReadiness

[Canonical definition](../../contracts/round-start.schema.json#/$defs/Readiness)

Server-issued evidence expires after 60 seconds and is bound to account/device/plan/input. Start rechecks authority, accepted dependencies and the locked fingerprint. It does not activate work.

```json
{
  "type": "object",
  "properties": {
    "readinessId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "deviceId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "planRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "inputFingerprint": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "verifiedActionIds": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Uuid"
      },
      "uniqueItems": true
    },
    "issuedAt": {
      "type": "string",
      "format": "date-time"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "readinessId",
    "driverId",
    "deviceId",
    "planId",
    "planRevision",
    "inputFingerprint",
    "verifiedActionIds",
    "issuedAt",
    "expiresAt"
  ],
  "additionalProperties": false,
  "description": "Server-issued evidence expires after 60 seconds and is bound to account/device/plan/input. Start rechecks authority, accepted dependencies and the locked fingerprint. It does not activate work."
}
```

### RoundStart

[Canonical definition](../../contracts/round-start.schema.json#/$defs/Start)

```json
{
  "type": "object",
  "properties": {
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "readinessId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "planId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedPlanRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "driverId",
    "readinessId",
    "planId",
    "expectedPlanRevision"
  ],
  "additionalProperties": false
}
```

### RoundWorkday

[Canonical definition](../../contracts/round-start.schema.json#/$defs/Workday)

```json
{
  "type": "object",
  "properties": {
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "state": {
      "const": "open"
    },
    "openedAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "workdayId",
    "driverId",
    "state",
    "openedAt"
  ],
  "additionalProperties": false
}
```

### RoundRound

[Canonical definition](../../contracts/round-start.schema.json#/$defs/Round)

Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20.

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "state": {
      "const": "active"
    },
    "startedAt": {
      "type": "string",
      "format": "date-time"
    },
    "owner": {
      "type": "object",
      "properties": {
        "accountId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "generation": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "accountId",
        "deviceId",
        "generation"
      ],
      "additionalProperties": false
    },
    "firstPlanId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "firstForecastId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "firstWorkloadId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "currentActivity": {
      "anyOf": [
        {
          "$ref": "current-activity.schema.json#/$defs/Activity"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "roundId",
    "workdayId",
    "driverId",
    "state",
    "startedAt",
    "owner",
    "firstPlanId",
    "firstForecastId",
    "firstWorkloadId",
    "currentActivity"
  ],
  "additionalProperties": false,
  "description": "Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20."
}
```

### RoundCurrent

[Canonical definition](../../contracts/round-start.schema.json#/$defs/Current)

```json
{
  "type": "object",
  "properties": {
    "workday": {
      "anyOf": [
        {
          "$ref": "#/$defs/Workday"
        },
        {
          "type": "null"
        }
      ]
    },
    "round": {
      "anyOf": [
        {
          "$ref": "#/$defs/Round"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "workday",
    "round"
  ],
  "additionalProperties": false
}
```

### RoundStartResult

[Canonical definition](../../contracts/round-start.schema.json#/$defs/StartResult)

```json
{
  "type": "object",
  "properties": {
    "disposition": {
      "enum": [
        "started",
        "already-active"
      ]
    },
    "workday": {
      "$ref": "#/$defs/Workday"
    },
    "round": {
      "$ref": "#/$defs/Round"
    }
  },
  "required": [
    "disposition",
    "workday",
    "round"
  ],
  "additionalProperties": false
}
```

### RoundStartCommand

[Canonical definition](../../contracts/round-start.schema.json#/$defs/StartCommand)

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
          "const": "round.start"
        },
        "payload": {
          "$ref": "#/$defs/Start"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      }
    }
  ]
}
```

### RoundActionStatus

[Canonical definition](../../contracts/round-start.schema.json#/$defs/ActionStatus)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "pending"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/StartActionResult"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    }
  ]
}
```

### RoundStartedEvent

[Canonical definition](../../contracts/round-start.schema.json#/$defs/StartedEvent)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "startedAt": {
      "type": "string",
      "format": "date-time"
    },
    "firstPlanId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "firstForecastId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "firstWorkloadId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskIds": {
      "type": "array",
      "items": {
        "$ref": "common.schema.json#/$defs/Uuid"
      },
      "minItems": 1,
      "uniqueItems": true
    }
  },
  "required": [
    "roundId",
    "workdayId",
    "driverId",
    "startedAt",
    "firstPlanId",
    "firstForecastId",
    "firstWorkloadId",
    "taskIds"
  ],
  "additionalProperties": false
}
```

### RoundStartActionResult

[Canonical definition](../../contracts/round-start.schema.json#/$defs/StartActionResult)

```json
{
  "allOf": [
    {
      "$ref": "action-result.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "const": "round.start"
        }
      },
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "receipt": {
                "type": "object",
                "properties": {
                  "businessStatus": {
                    "const": "accepted"
                  }
                },
                "required": [
                  "businessStatus"
                ]
              }
            },
            "required": [
              "receipt"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "response": {
                "type": "object",
                "properties": {
                  "body": {
                    "$ref": "#/$defs/StartResult"
                  }
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

### CurrentActionTime

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/ActionTime)

recordedAt is server acceptance recording time, not measured travel time. observation preserves the device report, including missing/uncertain clock evidence, without promoting it to server truth.

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "recordedAt": {
      "$ref": "common.schema.json#/$defs/UtcInstant"
    },
    "observation": {
      "$ref": "common.schema.json#/$defs/Observation"
    }
  },
  "required": [
    "actionId",
    "recordedAt",
    "observation"
  ],
  "additionalProperties": false,
  "description": "recordedAt is server acceptance recording time, not measured travel time. observation preserves the device report, including missing/uncertain clock evidence, without promoting it to server truth."
}
```

### CurrentActivity

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/Activity)

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
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "stage": {
      "enum": [
        "heading",
        "arrived"
      ]
    },
    "heading": {
      "$ref": "#/$defs/ActionTime"
    },
    "arrival": {
      "anyOf": [
        {
          "$ref": "#/$defs/ActionTime"
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
    "revision",
    "stage",
    "heading",
    "arrival"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "stage": {
            "const": "arrived"
          }
        },
        "required": [
          "stage"
        ]
      },
      "then": {
        "properties": {
          "arrival": {
            "$ref": "#/$defs/ActionTime"
          }
        }
      },
      "else": {
        "properties": {
          "arrival": {
            "type": "null"
          }
        }
      }
    }
  ]
}
```

### CurrentPhysicalOrigin

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/PhysicalOrigin)

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "enum": [
        "last-confirmed-stop",
        "manual-pin",
        "branch-pin"
      ]
    },
    "coordinates": {
      "$ref": "common.schema.json#/$defs/Coordinates"
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "attemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "time": {
      "$ref": "#/$defs/ActionTime"
    }
  },
  "required": [
    "kind",
    "coordinates",
    "revision",
    "roundId",
    "taskId",
    "attemptId",
    "time"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "kind": {
            "const": "last-confirmed-stop"
          }
        },
        "required": [
          "kind"
        ]
      },
      "then": {
        "properties": {
          "taskId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "attemptId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          }
        }
      },
      "else": {
        "properties": {
          "taskId": {
            "type": "null"
          },
          "attemptId": {
            "type": "null"
          }
        }
      }
    }
  ]
}
```

### CurrentTarget

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/Target)

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
      "$ref": "common.schema.json#/$defs/Coordinates"
    },
    "recipientName": {
      "type": "string"
    },
    "recipientPhone": {
      "type": "string"
    },
    "address": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "delivery": {
      "$ref": "#/$defs/DeliveryAffordance"
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "coordinates",
    "recipientName",
    "recipientPhone",
    "address",
    "delivery"
  ],
  "additionalProperties": false
}
```

### CurrentSelectHeading

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/SelectHeading)

Selection itself explicitly begins heading. Compare activity revision and previous attempt; replacing heading pauses its attempt with history. Arrived work must be resolved first. Same task/attempt keeps its identity. Route revision is deliberately not a command dependency.

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision"
  ],
  "additionalProperties": false,
  "description": "Selection itself explicitly begins heading. Compare activity revision and previous attempt; replacing heading pauses its attempt with history. Arrived work must be resolved first. Same task/attempt keeps its identity. Route revision is deliberately not a command dependency."
}
```

### CurrentArrival

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/Arrival)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision"
  ],
  "additionalProperties": false
}
```

### CurrentCorrectOrigin

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/CorrectOrigin)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedOriginRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "coordinates": {
      "$ref": "common.schema.json#/$defs/Coordinates"
    }
  },
  "required": [
    "roundId",
    "expectedOriginRevision",
    "coordinates"
  ],
  "additionalProperties": false
}
```

### CurrentSnapshot

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/Snapshot)

Coherent authorized round read; current is explicit, nextSuggestion is only the first other eligible member of a retained valid plan. May be null while planning. targets contains only currently eligible admitted work. Physical origin is recorded evidence; initial planning origin is not arrival.

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "owner": {
      "type": "object",
      "properties": {
        "accountId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "generation": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "accountId",
        "deviceId",
        "generation"
      ],
      "additionalProperties": false
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "currentActivity": {
      "anyOf": [
        {
          "$ref": "#/$defs/Activity"
        },
        {
          "type": "null"
        }
      ]
    },
    "physicalOrigin": {
      "anyOf": [
        {
          "$ref": "#/$defs/PhysicalOrigin"
        },
        {
          "type": "null"
        }
      ]
    },
    "planningOrigin": {
      "$ref": "routing.schema.json#/$defs/Origin"
    },
    "nextSuggestion": {
      "anyOf": [
        {
          "$ref": "#/$defs/Target"
        },
        {
          "type": "null"
        }
      ]
    },
    "planning": {
      "type": "object",
      "properties": {
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
        "updating": {
          "type": "boolean"
        }
      },
      "required": [
        "planId",
        "updating"
      ],
      "additionalProperties": false
    },
    "targets": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "$ref": "#/$defs/Target"
      }
    },
    "branchActivity": {
      "anyOf": [
        {
          "$ref": "#/$defs/BranchActivity"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "roundId",
    "driverId",
    "owner",
    "revision",
    "currentActivity",
    "physicalOrigin",
    "planningOrigin",
    "nextSuggestion",
    "planning",
    "targets"
  ],
  "additionalProperties": false,
  "description": "Coherent authorized round read; current is explicit, nextSuggestion is only the first other eligible member of a retained valid plan. May be null while planning. targets contains only currently eligible admitted work. Physical origin is recorded evidence; initial planning origin is not arrival."
}
```

### CurrentCommandResult

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/CommandResult)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "currentActivity": {
      "anyOf": [
        {
          "$ref": "#/$defs/Activity"
        },
        {
          "type": "null"
        }
      ]
    },
    "physicalOrigin": {
      "anyOf": [
        {
          "$ref": "#/$defs/PhysicalOrigin"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "roundId",
    "revision",
    "currentActivity",
    "physicalOrigin"
  ],
  "additionalProperties": false
}
```

### CurrentSelectHeadingCommand

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/SelectHeadingCommand)

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
          "const": "current.selectHeading"
        },
        "payload": {
          "$ref": "#/$defs/SelectHeading"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      }
    }
  ]
}
```

### CurrentArrivalCommand

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/ArrivalCommand)

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
          "const": "current.recordArrival"
        },
        "payload": {
          "$ref": "#/$defs/Arrival"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      }
    }
  ]
}
```

### CurrentCorrectOriginCommand

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/CorrectOriginCommand)

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
          "const": "current.correctOrigin"
        },
        "payload": {
          "$ref": "#/$defs/CorrectOrigin"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      }
    }
  ]
}
```

### CurrentActionResult

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/ActionResult)

```json
{
  "allOf": [
    {
      "$ref": "action-result.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "enum": [
            "current.selectHeading",
            "current.recordArrival",
            "current.correctOrigin"
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "receipt": {
                "type": "object",
                "properties": {
                  "businessStatus": {
                    "const": "accepted"
                  }
                },
                "required": [
                  "businessStatus"
                ]
              }
            },
            "required": [
              "receipt"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "response": {
                "type": "object",
                "properties": {
                  "body": {
                    "$ref": "#/$defs/CommandResult"
                  }
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

### CurrentActionStatus

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/ActionStatus)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "pending"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/ActionResult"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    }
  ]
}
```

### CurrentEvent

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/Event)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "stage": {
      "enum": [
        "heading",
        "arrived",
        "paused"
      ]
    },
    "time": {
      "$ref": "#/$defs/ActionTime"
    }
  },
  "required": [
    "roundId",
    "driverId",
    "taskId",
    "attemptId",
    "activityRevision",
    "stage",
    "time"
  ],
  "additionalProperties": false
}
```

### PlanningInputSettings

[Canonical definition](../../contracts/planning.schema.json#/$defs/InputSettings)

Server-effective settings. Origin is the last explicit arrival/manual correction, falling back to the draft manual pin. A caller cannot assert last-confirmed-stop through saveDraft.

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "$ref": "routing.schema.json#/$defs/Mode"
    },
    "origin": {
      "$ref": "routing.schema.json#/$defs/Origin"
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
  "description": "Server-effective settings. Origin is the last explicit arrival/manual correction, falling back to the draft manual pin. A caller cannot assert last-confirmed-stop through saveDraft."
}
```

### CurrentHeadingEvent

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/HeadingEvent)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "stage": {
      "enum": [
        "heading",
        "paused"
      ]
    },
    "time": {
      "$ref": "#/$defs/ActionTime"
    }
  },
  "required": [
    "roundId",
    "driverId",
    "taskId",
    "attemptId",
    "activityRevision",
    "stage",
    "time"
  ],
  "additionalProperties": false
}
```

### CurrentArrivalEvent

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/ArrivalEvent)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "stage": {
      "const": "arrived"
    },
    "time": {
      "$ref": "#/$defs/ActionTime"
    }
  },
  "required": [
    "roundId",
    "driverId",
    "taskId",
    "attemptId",
    "activityRevision",
    "stage",
    "time"
  ],
  "additionalProperties": false
}
```

### OutcomeMoney

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Money)

```json
{
  "$ref": "./b2b-intake.schema.json#/$defs/Money"
}
```

### OutcomePiece

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Piece)

```json
{
  "type": "object",
  "properties": {
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "delivered": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    }
  },
  "required": [
    "sourceLineId",
    "delivered"
  ],
  "additionalProperties": false
}
```

### OutcomeFull

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Full)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "reportedCollection": {
      "$ref": "#/$defs/Money"
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision"
  ],
  "additionalProperties": false
}
```

### OutcomePartial

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Partial)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "pieces": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Piece"
      },
      "minItems": 1,
      "maxItems": 100
    },
    "reportedCollection": {
      "$ref": "#/$defs/Money"
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision",
    "pieces",
    "reportedCollection"
  ],
  "additionalProperties": false
}
```

### OutcomeRefusal

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Refusal)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "shippingPayment": {
      "enum": [
        "collected",
        "refused"
      ]
    },
    "reportedCollection": {
      "$ref": "#/$defs/Money"
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision"
  ],
  "additionalProperties": false
}
```

### OutcomeNoAnswer

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/NoAnswer)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision"
  ],
  "additionalProperties": false
}
```

### OutcomeFullCommand

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/FullCommand)

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
          "const": "outcome.recordFull"
        },
        "payload": {
          "$ref": "#/$defs/Full"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### OutcomePartialCommand

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/PartialCommand)

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
          "const": "outcome.recordPartial"
        },
        "payload": {
          "$ref": "#/$defs/Partial"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### OutcomeRefusalCommand

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/RefusalCommand)

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
          "const": "outcome.recordRefusal"
        },
        "payload": {
          "$ref": "#/$defs/Refusal"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### OutcomeNoAnswerCommand

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/NoAnswerCommand)

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
          "const": "outcome.recordNoAnswer"
        },
        "payload": {
          "$ref": "#/$defs/NoAnswer"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### OutcomeLineResult

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/LineResult)

```json
{
  "type": "object",
  "properties": {
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceQuantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    },
    "delivered": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "heldReturnRequired": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "unitDue": {
      "$ref": "#/$defs/Money"
    }
  },
  "required": [
    "sourceLineId",
    "sourceQuantity",
    "delivered",
    "heldReturnRequired",
    "unitDue"
  ],
  "additionalProperties": false
}
```

### OutcomeCollection

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Collection)

```json
{
  "type": "object",
  "properties": {
    "reported": {
      "anyOf": [
        {
          "$ref": "#/$defs/Money"
        },
        {
          "type": "null"
        }
      ]
    },
    "goods": {
      "$ref": "#/$defs/Money"
    },
    "shipping": {
      "$ref": "#/$defs/Money"
    },
    "unpaidShipping": {
      "$ref": "#/$defs/Money"
    },
    "shippingStatus": {
      "enum": [
        "collected",
        "explicitly-unpaid",
        "not-attempted",
        "not-due",
        "not-applicable"
      ]
    }
  },
  "required": [
    "reported",
    "goods",
    "shipping",
    "unpaidShipping",
    "shippingStatus"
  ],
  "additionalProperties": false
}
```

### OutcomeCalculation

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Calculation)

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "enum": [
        "company",
        "personal"
      ]
    },
    "outcome": {
      "enum": [
        "full",
        "partial",
        "refused",
        "no-answer"
      ]
    },
    "lines": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/LineResult"
      },
      "maxItems": 100
    },
    "collection": {
      "$ref": "#/$defs/Collection"
    },
    "returnRequired": {
      "type": "boolean"
    }
  },
  "required": [
    "kind",
    "outcome",
    "lines",
    "collection",
    "returnRequired"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "kind": {
            "const": "personal"
          }
        },
        "required": [
          "kind"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "outcome": {
            "enum": [
              "full",
              "refused",
              "no-answer"
            ]
          },
          "lines": {
            "maxItems": 0,
            "type": "array"
          },
          "returnRequired": {
            "const": false
          },
          "collection": {
            "type": "object",
            "properties": {
              "shippingStatus": {
                "const": "not-applicable"
              }
            }
          }
        },
        "type": "object"
      },
      "else": {
        "properties": {
          "lines": {
            "minItems": 1,
            "type": "array"
          }
        },
        "type": "object"
      }
    },
    {
      "if": {
        "properties": {
          "outcome": {
            "const": "full"
          }
        },
        "required": [
          "outcome"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "returnRequired": {
            "const": false
          },
          "lines": {
            "items": {
              "type": "object",
              "properties": {
                "heldReturnRequired": {
                  "const": 0
                }
              }
            },
            "type": "array"
          }
        },
        "type": "object"
      }
    },
    {
      "if": {
        "properties": {
          "outcome": {
            "enum": [
              "refused",
              "no-answer"
            ]
          }
        },
        "required": [
          "outcome"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "lines": {
            "items": {
              "type": "object",
              "properties": {
                "delivered": {
                  "const": 0
                }
              }
            },
            "type": "array"
          }
        },
        "type": "object"
      }
    },
    {
      "if": {
        "properties": {
          "outcome": {
            "const": "no-answer"
          }
        },
        "required": [
          "outcome"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "collection": {
            "type": "object",
            "properties": {
              "reported": {
                "type": "null"
              },
              "shipping": {
                "type": "object",
                "properties": {
                  "amountMinor": {
                    "const": 0
                  }
                }
              },
              "unpaidShipping": {
                "type": "object",
                "properties": {
                  "amountMinor": {
                    "const": 0
                  }
                }
              },
              "shippingStatus": {
                "enum": [
                  "not-attempted",
                  "not-applicable"
                ]
              }
            }
          }
        },
        "type": "object"
      }
    }
  ]
}
```

### OutcomeRecord

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Record)

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "enum": [
        "company",
        "personal"
      ]
    },
    "outcome": {
      "enum": [
        "full",
        "partial",
        "refused",
        "no-answer"
      ]
    },
    "lines": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/LineResult"
      },
      "maxItems": 100
    },
    "collection": {
      "$ref": "#/$defs/Collection"
    },
    "returnRequired": {
      "type": "boolean"
    },
    "outcomeId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "branchId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceReference": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/SourceReference"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "time": {
      "$ref": "./current-activity.schema.json#/$defs/ActionTime"
    },
    "heading": {
      "anyOf": [
        {
          "$ref": "./current-activity.schema.json#/$defs/ActionTime"
        },
        {
          "type": "null"
        }
      ]
    },
    "arrival": {
      "anyOf": [
        {
          "$ref": "./current-activity.schema.json#/$defs/ActionTime"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceDispatchCycleId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "kind",
    "outcome",
    "lines",
    "collection",
    "returnRequired",
    "outcomeId",
    "revision",
    "roundId",
    "workdayId",
    "driverId",
    "taskId",
    "attemptId",
    "dispatchCycleId",
    "branchId",
    "sourceReference",
    "sourceRevision",
    "assignmentRevision",
    "time",
    "heading",
    "arrival",
    "sourceDispatchCycleId"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "kind": {
            "const": "personal"
          }
        },
        "required": [
          "kind"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "outcome": {
            "enum": [
              "full",
              "refused",
              "no-answer"
            ]
          },
          "lines": {
            "maxItems": 0,
            "type": "array"
          },
          "returnRequired": {
            "const": false
          },
          "collection": {
            "type": "object",
            "properties": {
              "shippingStatus": {
                "const": "not-applicable"
              }
            }
          }
        },
        "type": "object"
      },
      "else": {
        "properties": {
          "lines": {
            "minItems": 1,
            "type": "array"
          }
        },
        "type": "object"
      }
    },
    {
      "if": {
        "properties": {
          "outcome": {
            "const": "full"
          }
        },
        "required": [
          "outcome"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "returnRequired": {
            "const": false
          },
          "lines": {
            "items": {
              "type": "object",
              "properties": {
                "heldReturnRequired": {
                  "const": 0
                }
              }
            },
            "type": "array"
          }
        },
        "type": "object"
      }
    },
    {
      "if": {
        "properties": {
          "outcome": {
            "enum": [
              "refused",
              "no-answer"
            ]
          }
        },
        "required": [
          "outcome"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "lines": {
            "items": {
              "type": "object",
              "properties": {
                "delivered": {
                  "const": 0
                }
              }
            },
            "type": "array"
          }
        },
        "type": "object"
      }
    },
    {
      "if": {
        "properties": {
          "outcome": {
            "const": "no-answer"
          }
        },
        "required": [
          "outcome"
        ],
        "type": "object"
      },
      "then": {
        "properties": {
          "collection": {
            "type": "object",
            "properties": {
              "reported": {
                "type": "null"
              },
              "shipping": {
                "type": "object",
                "properties": {
                  "amountMinor": {
                    "const": 0
                  }
                }
              },
              "unpaidShipping": {
                "type": "object",
                "properties": {
                  "amountMinor": {
                    "const": 0
                  }
                }
              },
              "shippingStatus": {
                "enum": [
                  "not-attempted",
                  "not-applicable"
                ]
              }
            }
          }
        },
        "type": "object"
      }
    }
  ]
}
```

### OutcomeCommandResult

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/CommandResult)

```json
{
  "type": "object",
  "properties": {
    "outcome": {
      "$ref": "#/$defs/Record"
    },
    "current": {
      "$ref": "./current-activity.schema.json#/$defs/CommandResult"
    }
  },
  "required": [
    "outcome",
    "current"
  ],
  "additionalProperties": false
}
```

### OutcomeActionResult

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/ActionResult)

```json
{
  "allOf": [
    {
      "$ref": "action-result.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "enum": [
            "outcome.recordFull",
            "outcome.recordPartial",
            "outcome.recordRefusal",
            "outcome.recordNoAnswer"
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "receipt": {
                "type": "object",
                "properties": {
                  "businessStatus": {
                    "const": "accepted"
                  }
                },
                "required": [
                  "businessStatus"
                ]
              }
            },
            "required": [
              "receipt"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "response": {
                "type": "object",
                "properties": {
                  "body": {
                    "$ref": "#/$defs/CommandResult"
                  }
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

### OutcomeActionStatus

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/ActionStatus)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "pending"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/ActionResult"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    }
  ]
}
```

### OutcomeProgress

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Progress)

```json
{
  "type": "object",
  "properties": {
    "processed": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "full": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "partial": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "refused": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "noAnswer": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "deliveredPieces": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "heldReturnRequiredPieces": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "collection": {
      "type": "array",
      "maxItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "currency": {
            "const": "EGP"
          },
          "exponent": {
            "const": 2
          },
          "reportedMinor": {
            "type": "string",
            "pattern": "^(0|[1-9][0-9]*)$"
          },
          "unpaidShippingMinor": {
            "type": "string",
            "pattern": "^(0|[1-9][0-9]*)$"
          }
        },
        "required": [
          "currency",
          "exponent",
          "reportedMinor",
          "unpaidShippingMinor"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "processed",
    "full",
    "partial",
    "refused",
    "noAnswer",
    "deliveredPieces",
    "heldReturnRequiredPieces",
    "collection"
  ],
  "additionalProperties": false
}
```

### OutcomeSnapshot

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Snapshot)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Record"
      }
    },
    "progress": {
      "$ref": "#/$defs/Progress"
    },
    "history": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Record"
      },
      "description": "Preserved outcomes including earlier attempts. Collection totals include all history; items count latest resolved attempts only."
    },
    "custody": {
      "type": "array",
      "description": "P21 current custody for latest resolved company attempts in this snapshot. Original outcome lines retain historical return-required quantities.",
      "items": {
        "type": "object",
        "properties": {
          "outcomeId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "dispatchCycleId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "sourceLineId": {
            "$ref": "./common.schema.json#/$defs/ExternalId"
          },
          "balance": {
            "$ref": "./common.schema.json#/$defs/PieceBalance"
          }
        },
        "required": [
          "outcomeId",
          "dispatchCycleId",
          "sourceLineId",
          "balance"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "roundId",
    "items",
    "progress"
  ],
  "additionalProperties": false
}
```

### OutcomeEvent

[Canonical definition](../../contracts/outcomes.schema.json#/$defs/Event)

```json
{
  "type": "object",
  "properties": {
    "outcome": {
      "$ref": "#/$defs/Record"
    }
  },
  "required": [
    "outcome"
  ],
  "additionalProperties": false
}
```

### EligibilityDefer

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Defer)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedEligibilityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "earliestAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision",
    "expectedEligibilityRevision",
    "earliestAt"
  ],
  "additionalProperties": false
}
```

### EligibilityDeferCommand

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/DeferCommand)

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
          "const": "task.deferWhole"
        },
        "payload": {
          "$ref": "#/$defs/Defer"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### EligibilityRetry

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Retry)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedEligibilityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision",
    "expectedEligibilityRevision"
  ],
  "additionalProperties": false
}
```

### EligibilityRetryCommand

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/RetryCommand)

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
          "const": "task.retryWhole"
        },
        "payload": {
          "$ref": "#/$defs/Retry"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### EligibilityActivate

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Activate)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedEligibilityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision",
    "expectedEligibilityRevision"
  ],
  "additionalProperties": false
}
```

### EligibilityActivateCommand

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/ActivateCommand)

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
          "const": "task.activateDeferred"
        },
        "payload": {
          "$ref": "#/$defs/Activate"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### EligibilityUrgency

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Urgency)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedEligibilityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "urgency": {
      "enum": [
        "ordinary",
        "urgent"
      ]
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision",
    "expectedEligibilityRevision",
    "urgency"
  ],
  "additionalProperties": false
}
```

### EligibilityUrgencyCommand

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/UrgencyCommand)

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
          "const": "task.setDriverUrgency"
        },
        "payload": {
          "$ref": "#/$defs/Urgency"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      },
      "required": []
    }
  ]
}
```

### EligibilityAllowedAction

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/AllowedAction)

```json
{
  "type": "object",
  "properties": {
    "allowed": {
      "type": "boolean"
    },
    "blocker": {
      "anyOf": [
        {
          "enum": [
            "not-held",
            "different-driver",
            "receipt-or-disposition",
            "partial-or-delivered",
            "current-customer",
            "result-required",
            "not-deferred",
            "earliest-time",
            "location-required",
            "capacity",
            "round-closed"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "message": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "allowed",
    "blocker",
    "message"
  ],
  "additionalProperties": false
}
```

### EligibilityState

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/State)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
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
    "urgency": {
      "enum": [
        "ordinary",
        "urgent"
      ]
    },
    "deferred": {
      "type": "boolean"
    },
    "latestOutcomeId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "actions": {
      "type": "object",
      "properties": {
        "defer": {
          "$ref": "#/$defs/AllowedAction"
        },
        "retry": {
          "$ref": "#/$defs/AllowedAction"
        },
        "activate": {
          "$ref": "#/$defs/AllowedAction"
        },
        "urgency": {
          "$ref": "#/$defs/AllowedAction"
        }
      },
      "required": [
        "defer",
        "retry",
        "activate",
        "urgency"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "revision",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "earliestAt",
    "urgency",
    "deferred",
    "latestOutcomeId",
    "actions"
  ],
  "additionalProperties": false
}
```

### EligibilityRecord

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Record)

```json
{
  "type": "object",
  "properties": {
    "operationId": {
      "enum": [
        "task.deferWhole",
        "task.retryWhole",
        "task.activateDeferred",
        "task.setDriverUrgency"
      ]
    },
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "previousAttemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
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
    "urgency": {
      "enum": [
        "ordinary",
        "urgent"
      ]
    },
    "deferred": {
      "type": "boolean"
    },
    "time": {
      "$ref": "./current-activity.schema.json#/$defs/ActionTime"
    },
    "sourceReference": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/SourceReference"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceDispatchCycleId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/ExternalId"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceRevision": {
      "$ref": "./common.schema.json#/$defs/Revision"
    },
    "assignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "mode": {
      "enum": [
        "active-round",
        "preparation"
      ],
      "description": "Preparation uses the last ended round only as an ownership anchor; it never reopens its execution or workday."
    }
  },
  "required": [
    "operationId",
    "roundId",
    "driverId",
    "taskId",
    "previousAttemptId",
    "attemptId",
    "revision",
    "earliestAt",
    "urgency",
    "deferred",
    "time",
    "sourceReference",
    "sourceDispatchCycleId",
    "sourceRevision",
    "assignmentRevision",
    "dispatchCycleId"
  ],
  "additionalProperties": false
}
```

### EligibilityCommandResult

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/CommandResult)

```json
{
  "type": "object",
  "properties": {
    "change": {
      "$ref": "#/$defs/Record"
    },
    "state": {
      "$ref": "#/$defs/State"
    }
  },
  "required": [
    "change",
    "state"
  ],
  "additionalProperties": false
}
```

### EligibilityEvent

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Event)

```json
{
  "type": "object",
  "properties": {
    "change": {
      "$ref": "#/$defs/Record"
    }
  },
  "required": [
    "change"
  ],
  "additionalProperties": false
}
```

### EligibilityActionResult

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/ActionResult)

```json
{
  "allOf": [
    {
      "$ref": "action-result.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "enum": [
            "task.deferWhole",
            "task.retryWhole",
            "task.activateDeferred",
            "task.setDriverUrgency"
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "receipt": {
                "type": "object",
                "properties": {
                  "businessStatus": {
                    "const": "accepted"
                  }
                },
                "required": [
                  "businessStatus"
                ]
              }
            },
            "required": [
              "receipt"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "response": {
                "type": "object",
                "properties": {
                  "body": {
                    "$ref": "#/$defs/CommandResult"
                  }
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

### EligibilityActionStatus

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/ActionStatus)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "pending"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/ActionResult"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    }
  ]
}
```

### EligibilitySnapshot

[Canonical definition](../../contracts/eligibility.schema.json#/$defs/Snapshot)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "currentAttemptId": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/State"
      }
    },
    "history": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Record"
      }
    },
    "mode": {
      "enum": [
        "active-round",
        "preparation",
        "historical"
      ]
    }
  },
  "required": [
    "roundId",
    "activityRevision",
    "currentAttemptId",
    "items",
    "history"
  ],
  "additionalProperties": false
}
```

### ClosureClose

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/Close)

roundId anchors execution ownership. Day end without an active round must name the most recent round in that day. A heading needs explicit pause-heading; an arrived customer requires an outcome first. Unknown dependencies keep the action pending and are replayed with its original ID.

```json
{
  "type": "object",
  "properties": {
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActiveRoundId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "currentAction": {
      "enum": [
        "require-none",
        "pause-heading"
      ]
    }
  },
  "required": [
    "workdayId",
    "roundId",
    "expectedActiveRoundId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "currentAction"
  ],
  "additionalProperties": false,
  "description": "roundId anchors execution ownership. Day end without an active round must name the most recent round in that day. A heading needs explicit pause-heading; an arrived customer requires an outcome first. Unknown dependencies keep the action pending and are replayed with its original ID."
}
```

### ClosureEndRoundCommand

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/EndRoundCommand)

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
          "const": "round.end"
        },
        "payload": {
          "allOf": [
            {
              "$ref": "#/$defs/Close"
            },
            {
              "type": "object",
              "properties": {
                "expectedActiveRoundId": {
                  "$ref": "common.schema.json#/$defs/Uuid"
                }
              }
            }
          ]
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          },
          "required": [
            "kind"
          ]
        }
      }
    }
  ]
}
```

### ClosureEndDayCommand

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/EndDayCommand)

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
          "const": "workday.end"
        },
        "payload": {
          "$ref": "#/$defs/Close"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          },
          "required": [
            "kind"
          ]
        }
      }
    }
  ]
}
```

### ClosureRecord

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/Record)

```json
{
  "type": "object",
  "properties": {
    "closureId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "operationId": {
      "enum": [
        "round.end",
        "workday.end"
      ]
    },
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "ownerRoundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "endedRoundId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "roundEndedAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "workdayEndedAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "pausedActivity": {
      "anyOf": [
        {
          "$ref": "current-activity.schema.json#/$defs/Activity"
        },
        {
          "type": "null"
        }
      ]
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "time": {
      "$ref": "current-activity.schema.json#/$defs/ActionTime"
    }
  },
  "required": [
    "closureId",
    "operationId",
    "workdayId",
    "driverId",
    "ownerRoundId",
    "endedRoundId",
    "roundEndedAt",
    "workdayEndedAt",
    "pausedActivity",
    "activityRevision",
    "time"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "operationId": {
            "const": "round.end"
          }
        },
        "required": [
          "operationId"
        ]
      },
      "then": {
        "properties": {
          "endedRoundId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "roundEndedAt": {
            "$ref": "common.schema.json#/$defs/UtcInstant"
          },
          "workdayEndedAt": {
            "type": "null"
          }
        }
      },
      "else": {
        "properties": {
          "workdayEndedAt": {
            "$ref": "common.schema.json#/$defs/UtcInstant"
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "endedRoundId": {
            "type": "null"
          }
        },
        "required": [
          "endedRoundId"
        ]
      },
      "then": {
        "properties": {
          "roundEndedAt": {
            "type": "null"
          }
        }
      },
      "else": {
        "properties": {
          "roundEndedAt": {
            "$ref": "common.schema.json#/$defs/UtcInstant"
          }
        }
      }
    }
  ]
}
```

### ClosureCommandResult

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/CommandResult)

```json
{
  "type": "object",
  "properties": {
    "disposition": {
      "enum": [
        "closed",
        "already-closed"
      ]
    },
    "closure": {
      "$ref": "#/$defs/Record"
    }
  },
  "required": [
    "disposition",
    "closure"
  ],
  "additionalProperties": false
}
```

### ClosureActionResult

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/ActionResult)

```json
{
  "allOf": [
    {
      "$ref": "action-result.v1.schema.json"
    },
    {
      "type": "object",
      "properties": {
        "operationId": {
          "enum": [
            "round.end",
            "workday.end"
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "type": "object",
            "properties": {
              "receipt": {
                "type": "object",
                "properties": {
                  "businessStatus": {
                    "const": "accepted"
                  }
                },
                "required": [
                  "businessStatus"
                ]
              }
            },
            "required": [
              "receipt"
            ]
          },
          "then": {
            "type": "object",
            "properties": {
              "response": {
                "type": "object",
                "properties": {
                  "body": {
                    "$ref": "#/$defs/CommandResult"
                  }
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

### ClosureActionStatus

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/ActionStatus)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "pending"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "#/$defs/ActionResult"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    }
  ]
}
```

### ClosureSourceItem

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/SourceItem)

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "sourceReference": {
      "$ref": "common.schema.json#/$defs/SourceReference"
    },
    "sourceDispatchCycleId": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "taskId",
    "dispatchCycleId",
    "sourceReference",
    "sourceDispatchCycleId"
  ],
  "additionalProperties": false
}
```

### ClosureEvent

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/Event)

```json
{
  "type": "object",
  "properties": {
    "closureId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "endedRoundId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "roundEndedAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "workdayEndedAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "time": {
      "$ref": "current-activity.schema.json#/$defs/ActionTime"
    },
    "tasks": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/SourceItem"
      }
    }
  },
  "required": [
    "closureId",
    "driverId",
    "workdayId",
    "endedRoundId",
    "roundEndedAt",
    "workdayEndedAt",
    "time",
    "tasks"
  ],
  "additionalProperties": false
}
```

### ClosureCarryItem

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/CarryItem)

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
    "sourceReference": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/SourceReference"
        },
        {
          "type": "null"
        }
      ]
    },
    "sourceDispatchCycleId": {
      "anyOf": [
        {
          "type": "string"
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
    "earliestAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "deferred": {
      "type": "boolean"
    },
    "admittedInWorkday": {
      "type": "boolean"
    },
    "outcome": {
      "anyOf": [
        {
          "enum": [
            "full",
            "partial",
            "refused",
            "no-answer"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "disposition": {
      "enum": [
        "unfinished",
        "return-required",
        "unsuccessful"
      ]
    },
    "eligibleNow": {
      "type": "boolean"
    },
    "blocker": {
      "anyOf": [
        {
          "enum": [
            "result-required",
            "deferred",
            "earliest-time",
            "location-required",
            "receipt-or-disposition",
            "capacity-admission"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "heldReturnRequiredPieces": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "heldPieces": {
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
    "unpaidShippingMinor": {
      "type": "string",
      "pattern": "^[0-9]+$"
    }
  },
  "required": [
    "taskId",
    "attemptId",
    "dispatchCycleId",
    "sourceReference",
    "sourceDispatchCycleId",
    "sourceRevision",
    "assignmentRevision",
    "pinRevision",
    "earliestAt",
    "deferred",
    "admittedInWorkday",
    "outcome",
    "disposition",
    "eligibleNow",
    "blocker",
    "heldReturnRequiredPieces",
    "heldPieces",
    "unpaidShippingMinor"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "eligibleNow": {
            "const": true
          }
        },
        "required": [
          "eligibleNow"
        ]
      },
      "then": {
        "properties": {
          "blocker": {
            "type": "null"
          },
          "deferred": {
            "const": false
          },
          "outcome": {
            "type": "null"
          }
        }
      },
      "else": {
        "properties": {
          "blocker": {
            "type": "string"
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "sourceReference": {
            "type": "null"
          }
        },
        "required": [
          "sourceReference"
        ]
      },
      "then": {
        "properties": {
          "dispatchCycleId": {
            "type": "null"
          },
          "sourceDispatchCycleId": {
            "type": "null"
          },
          "heldPieces": {
            "type": "null"
          },
          "heldReturnRequiredPieces": {
            "const": 0
          }
        }
      },
      "else": {
        "properties": {
          "dispatchCycleId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "sourceDispatchCycleId": {
            "type": "string"
          },
          "heldPieces": {
            "type": "integer"
          }
        }
      }
    }
  ]
}
```

### ClosureCarryForward

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/CarryForward)

```json
{
  "type": "object",
  "properties": {
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "asOf": {
      "$ref": "common.schema.json#/$defs/UtcInstant"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/CarryItem"
      }
    }
  },
  "required": [
    "workdayId",
    "driverId",
    "asOf",
    "items"
  ],
  "additionalProperties": false
}
```

### ClosureRoundSummary

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/RoundSummary)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "startedAt": {
      "$ref": "common.schema.json#/$defs/UtcInstant"
    },
    "endedAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "firstPlanId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "firstForecastId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "firstWorkloadId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "description": "Current retained activity revision, including a closure pause; use for explicit day end between rounds."
    }
  },
  "required": [
    "roundId",
    "startedAt",
    "endedAt",
    "firstPlanId",
    "firstForecastId",
    "firstWorkloadId"
  ],
  "additionalProperties": false
}
```

### ClosureSummary

[Canonical definition](../../contracts/workday-closure.schema.json#/$defs/Summary)

Workday admissions define distinct shipment and attempt denominators; each attempt is counted once across rounds. Outcomes are retained day-scoped history; shipment buckets use the latest outcome in this workday. Collections sum only amounts reported in this workday, never settlement. Carry-forward is a separately labelled current-holder read at asOf, not historical day inventory.

```json
{
  "type": "object",
  "properties": {
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "displayTimeZone": {
      "const": "Africa/Cairo"
    },
    "openedAt": {
      "$ref": "common.schema.json#/$defs/UtcInstant"
    },
    "endedAt": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/UtcInstant"
        },
        {
          "type": "null"
        }
      ]
    },
    "asOf": {
      "$ref": "common.schema.json#/$defs/UtcInstant"
    },
    "rounds": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/RoundSummary"
      }
    },
    "scope": {
      "type": "object",
      "properties": {
        "shipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "attempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "processedAttempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "fullShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "partialShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "refusedShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "noAnswerShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "unfinishedShipments": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "shipments",
        "attempts",
        "processedAttempts",
        "fullShipments",
        "partialShipments",
        "refusedShipments",
        "noAnswerShipments",
        "unfinishedShipments"
      ],
      "additionalProperties": false
    },
    "collection": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "currency": {
            "const": "EGP"
          },
          "exponent": {
            "const": 2
          },
          "reportedMinor": {
            "type": "string",
            "pattern": "^[0-9]+$"
          },
          "unreportedAttempts": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          }
        },
        "required": [
          "currency",
          "exponent",
          "reportedMinor",
          "unreportedAttempts"
        ],
        "additionalProperties": false
      }
    },
    "outcomes": {
      "type": "array",
      "items": {
        "$ref": "outcomes.schema.json#/$defs/Record"
      }
    },
    "carryForward": {
      "$ref": "#/$defs/CarryForward"
    }
  },
  "required": [
    "workdayId",
    "driverId",
    "displayTimeZone",
    "openedAt",
    "endedAt",
    "asOf",
    "rounds",
    "scope",
    "collection",
    "outcomes",
    "carryForward"
  ],
  "additionalProperties": false,
  "description": "Workday admissions define distinct shipment and attempt denominators; each attempt is counted once across rounds. Outcomes are retained day-scoped history; shipment buckets use the latest outcome in this workday. Collections sum only amounts reported in this workday, never settlement. Carry-forward is a separately labelled current-holder read at asOf, not historical day inventory."
}
```

### DeviceTakeover

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/Takeover)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedGeneration": {
      "$ref": "common.schema.json#/$defs/Generation"
    }
  },
  "required": [
    "roundId",
    "expectedGeneration"
  ],
  "additionalProperties": false
}
```

### DeviceTakeoverCommand

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/TakeoverCommand)

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
          "const": "device.takeOver"
        },
        "payload": {
          "$ref": "#/$defs/Takeover"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      }
    }
  ]
}
```

### DeviceTakeoverResult

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/TakeoverResult)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "workdayId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "owner": {
      "type": "object",
      "properties": {
        "accountId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "deviceId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "generation": {
          "$ref": "common.schema.json#/$defs/Generation"
        }
      },
      "required": [
        "accountId",
        "deviceId",
        "generation"
      ],
      "additionalProperties": false
    },
    "snapshotRequired": {
      "const": true
    }
  },
  "required": [
    "roundId",
    "workdayId",
    "driverId",
    "owner",
    "snapshotRequired"
  ],
  "additionalProperties": false
}
```

### DeviceSnapshot

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/Snapshot)

```json
{
  "type": "object",
  "properties": {
    "context": {
      "$ref": "#/$defs/Context"
    },
    "confirmedAt": {
      "$ref": "common.schema.json#/$defs/UtcInstant"
    },
    "current": {
      "anyOf": [
        {
          "$ref": "current-activity.schema.json#/$defs/Snapshot"
        },
        {
          "type": "null"
        }
      ]
    },
    "snapshotToken": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "context",
    "confirmedAt",
    "current",
    "snapshotToken"
  ],
  "additionalProperties": false
}
```

### DeviceActionStatus

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/ActionStatus)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "const": "pending"
        }
      },
      "required": [
        "actionId",
        "status"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "actionId": {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        "status": {
          "enum": [
            "accepted",
            "rejected",
            "review-required"
          ]
        },
        "result": {
          "$ref": "action-result.v1.schema.json"
        }
      },
      "required": [
        "actionId",
        "status",
        "result"
      ],
      "additionalProperties": false
    }
  ]
}
```

### DeviceFormerSubmission

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/FormerSubmission)

Submit the ORIGINAL immutable execution envelope and action ID. This evidence-only endpoint never executes it, including when it is still owned. Exact duplicate returns the original business result. Not a second wrapper action.

```json
{
  "description": "Submit the ORIGINAL immutable execution envelope and action ID. This evidence-only endpoint never executes it, including when it is still owned. Exact duplicate returns the original business result. Not a second wrapper action.",
  "oneOf": [
    {
      "$ref": "current-activity.schema.json#/$defs/SelectHeadingCommand"
    },
    {
      "$ref": "current-activity.schema.json#/$defs/ArrivalCommand"
    },
    {
      "$ref": "current-activity.schema.json#/$defs/CorrectOriginCommand"
    },
    {
      "$ref": "outcomes.schema.json#/$defs/FullCommand"
    },
    {
      "$ref": "outcomes.schema.json#/$defs/PartialCommand"
    },
    {
      "$ref": "outcomes.schema.json#/$defs/RefusalCommand"
    },
    {
      "$ref": "outcomes.schema.json#/$defs/NoAnswerCommand"
    },
    {
      "$ref": "eligibility.schema.json#/$defs/DeferCommand"
    },
    {
      "$ref": "eligibility.schema.json#/$defs/RetryCommand"
    },
    {
      "$ref": "eligibility.schema.json#/$defs/ActivateCommand"
    },
    {
      "$ref": "eligibility.schema.json#/$defs/UrgencyCommand"
    },
    {
      "$ref": "workday-closure.schema.json#/$defs/EndRoundCommand"
    },
    {
      "$ref": "workday-closure.schema.json#/$defs/EndDayCommand"
    }
  ]
}
```

### DeviceEvidenceSubmissionResult

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/EvidenceSubmissionResult)

```json
{
  "type": "object",
  "properties": {
    "submissionStatus": {
      "enum": [
        "received",
        "duplicate"
      ]
    },
    "result": {
      "$ref": "action-result.v1.schema.json"
    }
  },
  "required": [
    "submissionStatus",
    "result"
  ],
  "additionalProperties": false
}
```

### DeviceRecovery

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/Recovery)

```json
{
  "type": "object",
  "properties": {
    "adoptionImplemented": {
      "const": true
    },
    "state": {
      "enum": [
        "blocked",
        "requires-validation"
      ]
    },
    "constraints": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "enum": [
          "closed-workday",
          "dependent-receipt",
          "changed-assignment",
          "changed-source",
          "changed-attempt",
          "not-current-owner",
          "correction-not-authorized",
          "unsupported-operation",
          "dependent-redispatch",
          "unknown-generation",
          "changed-pin",
          "already-adopted",
          "ended-round",
          "claimed-handover",
          "unresolved-dependency"
        ]
      }
    },
    "currentGeneration": {
      "$ref": "common.schema.json#/$defs/Generation"
    },
    "effectiveOutcomeRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "adoptedOutcomeId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "adoptionImplemented",
    "state",
    "constraints",
    "currentGeneration",
    "effectiveOutcomeRevision",
    "activityRevision",
    "adoptedOutcomeId"
  ],
  "additionalProperties": false
}
```

### DeviceEvidence

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/Evidence)

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "result": {
      "$ref": "action-result.v1.schema.json"
    },
    "envelope": {
      "anyOf": [
        {
          "$ref": "action-envelope.v1.schema.json"
        },
        {
          "type": "null"
        }
      ]
    },
    "durableReceipt": {
      "const": true
    },
    "recovery": {
      "$ref": "#/$defs/Recovery"
    },
    "taskLabel": {
      "type": "string",
      "description": "Authorized admitted task recipient label for human review; absent for non-task evidence."
    }
  },
  "required": [
    "actionId",
    "result",
    "envelope",
    "durableReceipt",
    "recovery"
  ],
  "additionalProperties": false
}
```

### DeviceAdoption

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/Adoption)

P23 implemented: current assigned owner explicitly adopts a retained delivery outcome with the original receipt and unchanged source/assignment/pin. Expected revisions and current generation are revalidated. Open original day and no dependent receipt/disposition/redispatch or later attempt. Arrival-only evidence is retained but not adoptable. Client time grants no authority.

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "evidenceActionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "evidenceReceiptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedGeneration": {
      "$ref": "common.schema.json#/$defs/Generation"
    },
    "expectedOutcomeRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedSourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedAssignmentRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedPinRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "evidenceActionId",
    "evidenceReceiptId",
    "expectedGeneration",
    "expectedOutcomeRevision",
    "expectedActivityRevision",
    "expectedSourceRevision",
    "expectedAssignmentRevision",
    "expectedPinRevision"
  ],
  "additionalProperties": false,
  "description": "P23 implemented: current assigned owner explicitly adopts a retained delivery outcome with the original receipt and unchanged source/assignment/pin. Expected revisions and current generation are revalidated. Open original day and no dependent receipt/disposition/redispatch or later attempt. Arrival-only evidence is retained but not adoptable. Client time grants no authority."
}
```

### DeviceAdoptionCommand

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/AdoptionCommand)

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
          "const": "evidence.adoptCompatible"
        },
        "payload": {
          "$ref": "#/$defs/Adoption"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        }
      }
    }
  ]
}
```

### DeviceTransferEvent

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/TransferEvent)

Durable account-recipient notification intent; no shipment transfer, device secret or ERP business mutation. Transport is P25.

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "generation": {
      "$ref": "common.schema.json#/$defs/Generation"
    }
  },
  "required": [
    "actionId",
    "roundId",
    "driverId",
    "generation"
  ],
  "additionalProperties": false,
  "description": "Durable account-recipient notification intent; no shipment transfer, device secret or ERP business mutation. Transport is P25."
}
```

### DeviceEvidenceEvent

[Canonical definition](../../contracts/device-ownership.schema.json#/$defs/EvidenceEvent)

Durable submitting-account notification after rejected domain writes roll back. Query the scoped original action receipt; never imply business acceptance. No envelope/contact/money data in the notification.

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "businessStatus": {
      "enum": [
        "rejected",
        "review-required"
      ]
    },
    "code": {
      "$ref": "common.schema.json#/$defs/Problem/properties/code"
    }
  },
  "required": [
    "actionId",
    "roundId",
    "driverId",
    "businessStatus",
    "code"
  ],
  "additionalProperties": false,
  "description": "Durable submitting-account notification after rejected domain writes roll back. Query the scoped original action receipt; never imply business acceptance. No envelope/contact/money data in the notification."
}
```

### ReturnOffer

[Canonical definition](../../contracts/returns.schema.json#/$defs/Offer)

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
    "outcomeId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "quantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    }
  },
  "required": [
    "taskId",
    "dispatchCycleId",
    "outcomeId",
    "sourceLineId",
    "quantity"
  ],
  "additionalProperties": false
}
```

### ReturnRequest

[Canonical definition](../../contracts/returns.schema.json#/$defs/Request)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceBranchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Offer"
      },
      "minItems": 1
    }
  },
  "required": [
    "roundId",
    "sourceBranchId",
    "items"
  ],
  "additionalProperties": false
}
```

### ReturnSubsetItem

[Canonical definition](../../contracts/returns.schema.json#/$defs/SubsetItem)

```json
{
  "type": "object",
  "properties": {
    "itemId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "expectedRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "quantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    }
  },
  "required": [
    "itemId",
    "expectedRevision",
    "quantity"
  ],
  "additionalProperties": false
}
```

### ReturnReceive

[Canonical definition](../../contracts/returns.schema.json#/$defs/Receive)

```json
{
  "type": "object",
  "properties": {
    "requestId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "receivingBranchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/SubsetItem"
      },
      "minItems": 1
    }
  },
  "required": [
    "requestId",
    "receivingBranchId",
    "items"
  ],
  "additionalProperties": false
}
```

### ReturnDispose

[Canonical definition](../../contracts/returns.schema.json#/$defs/Dispose)

```json
{
  "type": "object",
  "properties": {
    "requestId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "receivingBranchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/SubsetItem"
      },
      "minItems": 1
    },
    "disposition": {
      "enum": [
        "lost",
        "damaged"
      ]
    }
  },
  "required": [
    "requestId",
    "receivingBranchId",
    "items",
    "disposition"
  ],
  "additionalProperties": false
}
```

### ReturnRequestCommand

[Canonical definition](../../contracts/returns.schema.json#/$defs/RequestCommand)

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
          "const": "return.requestHandover"
        },
        "context": {
          "$ref": "./common.schema.json#/$defs/DeviceContext"
        },
        "payload": {
          "$ref": "#/$defs/Request"
        }
      },
      "required": [
        "operationId",
        "context",
        "payload"
      ]
    }
  ]
}
```

### ReturnReceiveCommand

[Canonical definition](../../contracts/returns.schema.json#/$defs/ReceiveCommand)

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
      "const": "return.confirmSubsetReceipt"
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
      "$ref": "#/$defs/Receive"
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

### ReturnDisposeCommand

[Canonical definition](../../contracts/returns.schema.json#/$defs/DisposeCommand)

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
      "const": "return.recordDisposition"
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
      "$ref": "#/$defs/Dispose"
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

### ReturnCustody

[Canonical definition](../../contracts/returns.schema.json#/$defs/Custody)

```json
{
  "$ref": "./common.schema.json#/$defs/PieceBalance"
}
```

### ReturnItem

[Canonical definition](../../contracts/returns.schema.json#/$defs/Item)

```json
{
  "type": "object",
  "properties": {
    "itemId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "outcomeId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "requested": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    },
    "received": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "lost": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "damaged": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "unresolved": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "eligibility": {
      "enum": [
        "pending",
        "settled",
        "superseded"
      ]
    },
    "custody": {
      "$ref": "#/$defs/Custody"
    }
  },
  "required": [
    "itemId",
    "taskId",
    "dispatchCycleId",
    "outcomeId",
    "attemptId",
    "sourceLineId",
    "externalId",
    "sourceDispatchCycleId",
    "sourceRevision",
    "revision",
    "requested",
    "received",
    "lost",
    "damaged",
    "unresolved",
    "eligibility",
    "custody"
  ],
  "additionalProperties": false
}
```

### ReturnRequestView

[Canonical definition](../../contracts/returns.schema.json#/$defs/RequestView)

```json
{
  "type": "object",
  "properties": {
    "requestId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceBranchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "integrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "requestedAt": {
      "$ref": "./common.schema.json#/$defs/UtcInstant"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Item"
      },
      "minItems": 1
    },
    "sourceBranchName": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "description": "Current source-provisioned branch label for driver display; sourceBranchId remains authoritative."
    }
  },
  "required": [
    "requestId",
    "driverId",
    "sourceBranchId",
    "integrationId",
    "roundId",
    "requestedAt",
    "items"
  ],
  "additionalProperties": false
}
```

### ReturnRequestList

[Canonical definition](../../contracts/returns.schema.json#/$defs/RequestList)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/RequestView"
      },
      "minItems": 0
    },
    "nextCursor": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "items",
    "nextCursor"
  ],
  "additionalProperties": false
}
```

### ReturnGroupLine

[Canonical definition](../../contracts/returns.schema.json#/$defs/GroupLine)

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
    "outcomeId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "externalId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "availableToRequest": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "custody": {
      "$ref": "#/$defs/Custody"
    }
  },
  "required": [
    "taskId",
    "dispatchCycleId",
    "outcomeId",
    "sourceLineId",
    "externalId",
    "sourceDispatchCycleId",
    "availableToRequest",
    "custody"
  ],
  "additionalProperties": false
}
```

### ReturnGroup

[Canonical definition](../../contracts/returns.schema.json#/$defs/Group)

```json
{
  "type": "object",
  "properties": {
    "sourceBranchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "integrationId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/GroupLine"
      },
      "minItems": 1
    },
    "sourceBranchName": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "description": "Current source-provisioned branch label for driver display; sourceBranchId remains authoritative."
    }
  },
  "required": [
    "sourceBranchId",
    "integrationId",
    "items"
  ],
  "additionalProperties": false
}
```

### ReturnGroups

[Canonical definition](../../contracts/returns.schema.json#/$defs/Groups)

```json
{
  "type": "object",
  "properties": {
    "groups": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Group"
      },
      "minItems": 0
    },
    "pendingRequests": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/RequestView"
      },
      "description": "Authorized unresolved offers rediscovered across reload and phone takeover; request is not physical receipt."
    }
  },
  "required": [
    "groups"
  ],
  "additionalProperties": false
}
```

### ReturnClaim

[Canonical definition](../../contracts/returns.schema.json#/$defs/Claim)

```json
{
  "type": "object",
  "properties": {
    "itemId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "quantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    }
  },
  "required": [
    "itemId",
    "quantity"
  ],
  "additionalProperties": false
}
```

### ReturnConfirmationQuery

[Canonical definition](../../contracts/returns.schema.json#/$defs/ConfirmationQuery)

```json
{
  "type": "object",
  "properties": {
    "claims": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Claim"
      },
      "minItems": 1
    }
  },
  "required": [
    "claims"
  ],
  "additionalProperties": false
}
```

### ReturnConfirmation

[Canonical definition](../../contracts/returns.schema.json#/$defs/Confirmation)

```json
{
  "type": "object",
  "properties": {
    "requestId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "state": {
      "enum": [
        "confirmed",
        "waiting"
      ]
    },
    "message": {
      "type": "string"
    },
    "claims": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "itemId": {
            "$ref": "./common.schema.json#/$defs/Uuid"
          },
          "claimed": {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          },
          "confirmed": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000000
          },
          "waiting": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000000
          }
        },
        "required": [
          "itemId",
          "claimed",
          "confirmed",
          "waiting"
        ],
        "additionalProperties": false
      },
      "minItems": 1
    }
  },
  "required": [
    "requestId",
    "state",
    "message",
    "claims"
  ],
  "additionalProperties": false
}
```

### ReturnTransition

[Canonical definition](../../contracts/returns.schema.json#/$defs/Transition)

```json
{
  "type": "object",
  "properties": {
    "transitionId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "requestId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "itemId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "dispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "outcomeId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "sourceLineId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceReference": {
      "$ref": "./common.schema.json#/$defs/SourceReference"
    },
    "sourceDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/ExternalId"
    },
    "sourceBranchId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "kind": {
      "enum": [
        "received",
        "lost",
        "damaged"
      ]
    },
    "quantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "time": {
      "$ref": "./current-activity.schema.json#/$defs/ActionTime"
    },
    "identity": {
      "$ref": "./provisioning.schema.json#/$defs/VerifiedService"
    }
  },
  "required": [
    "transitionId",
    "requestId",
    "itemId",
    "taskId",
    "dispatchCycleId",
    "outcomeId",
    "sourceLineId",
    "sourceReference",
    "sourceDispatchCycleId",
    "sourceBranchId",
    "kind",
    "quantity",
    "revision",
    "time",
    "identity"
  ],
  "additionalProperties": false
}
```

### ReturnCommandResult

[Canonical definition](../../contracts/returns.schema.json#/$defs/CommandResult)

```json
{
  "type": "object",
  "properties": {
    "request": {
      "$ref": "#/$defs/RequestView"
    },
    "transitions": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Transition"
      },
      "minItems": 0
    }
  },
  "required": [
    "request",
    "transitions"
  ],
  "additionalProperties": false
}
```

### ReturnActionResult

[Canonical definition](../../contracts/returns.schema.json#/$defs/ActionResult)

```json
{
  "$ref": "./action-result.v1.schema.json"
}
```

### ReturnActionStatus

[Canonical definition](../../contracts/returns.schema.json#/$defs/ActionStatus)

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
      "$ref": "#/$defs/ActionResult"
    }
  },
  "required": [
    "actionId",
    "status"
  ],
  "additionalProperties": false
}
```

### ReturnRequestedEvent

[Canonical definition](../../contracts/returns.schema.json#/$defs/RequestedEvent)

```json
{
  "type": "object",
  "properties": {
    "request": {
      "$ref": "#/$defs/RequestView"
    }
  },
  "required": [
    "request"
  ],
  "additionalProperties": false
}
```

### ReturnReceivedEvent

[Canonical definition](../../contracts/returns.schema.json#/$defs/ReceivedEvent)

```json
{
  "type": "object",
  "properties": {
    "transition": {
      "allOf": [
        {
          "$ref": "#/$defs/Transition"
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "received"
            }
          },
          "required": [
            "kind"
          ]
        }
      ]
    }
  },
  "required": [
    "transition"
  ],
  "additionalProperties": false
}
```

### ReturnDispositionEvent

[Canonical definition](../../contracts/returns.schema.json#/$defs/DispositionEvent)

```json
{
  "type": "object",
  "properties": {
    "transition": {
      "allOf": [
        {
          "$ref": "#/$defs/Transition"
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "enum": [
                "lost",
                "damaged"
              ]
            }
          },
          "required": [
            "kind"
          ]
        }
      ]
    }
  },
  "required": [
    "transition"
  ],
  "additionalProperties": false
}
```

### BranchInterrupt

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/Interrupt)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "requestId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "claims": {
      "type": "array",
      "minItems": 1,
      "maxItems": 500,
      "items": {
        "type": "object",
        "properties": {
          "itemId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "quantity": {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          }
        },
        "required": [
          "itemId",
          "quantity"
        ],
        "additionalProperties": false
      }
    },
    "serviceEstimateSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    }
  },
  "required": [
    "roundId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "requestId",
    "claims",
    "serviceEstimateSeconds"
  ],
  "additionalProperties": false
}
```

### BranchTransition

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/Transition)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedActivityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "expectedCurrentAttemptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "segmentId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedBranchRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "roundId",
    "expectedActivityRevision",
    "expectedCurrentAttemptId",
    "segmentId",
    "expectedBranchRevision"
  ],
  "additionalProperties": false
}
```

### BranchResult

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/Result)

```json
{
  "type": "object",
  "properties": {
    "branchActivity": {
      "$ref": "current-activity.schema.json#/$defs/BranchActivity"
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
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
    }
  },
  "required": [
    "branchActivity",
    "activityRevision",
    "planId"
  ],
  "additionalProperties": false
}
```

### BranchEvent

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/Event)

```json
{
  "type": "object",
  "properties": {
    "segmentId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "driverId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "sourceBranchId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "stage": {
      "enum": [
        "heading",
        "arrived",
        "resumed"
      ]
    },
    "activityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "time": {
      "$ref": "current-activity.schema.json#/$defs/ActionTime"
    }
  },
  "required": [
    "segmentId",
    "roundId",
    "driverId",
    "sourceBranchId",
    "stage",
    "activityRevision",
    "time"
  ],
  "additionalProperties": false
}
```

### BranchInterruptCommand

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/InterruptCommand)

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
          "const": "branch.interruptRound"
        },
        "context": {
          "$ref": "common.schema.json#/$defs/DeviceContext"
        },
        "payload": {
          "$ref": "#/$defs/Interrupt"
        }
      },
      "required": [
        "operationId",
        "context",
        "payload"
      ]
    }
  ]
}
```

### BranchArrivalCommand

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/ArrivalCommand)

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
          "const": "branch.recordArrival"
        },
        "context": {
          "$ref": "common.schema.json#/$defs/DeviceContext"
        },
        "payload": {
          "$ref": "#/$defs/Transition"
        }
      },
      "required": [
        "operationId",
        "context",
        "payload"
      ]
    }
  ]
}
```

### BranchResumeCommand

[Canonical definition](../../contracts/branch-activity.schema.json#/$defs/ResumeCommand)

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
          "const": "branch.resumeRound"
        },
        "context": {
          "$ref": "common.schema.json#/$defs/DeviceContext"
        },
        "payload": {
          "$ref": "#/$defs/Transition"
        }
      },
      "required": [
        "operationId",
        "context",
        "payload"
      ]
    }
  ]
}
```

### CurrentBranchActivity

[Canonical definition](../../contracts/current-activity.schema.json#/$defs/BranchActivity)

```json
{
  "type": "object",
  "properties": {
    "segmentId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "requestId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "sourceBranchId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "stage": {
      "enum": [
        "heading",
        "arrived",
        "resumed"
      ]
    },
    "coordinates": {
      "$ref": "common.schema.json#/$defs/Coordinates"
    },
    "serviceEstimateSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    },
    "claims": {
      "type": "array",
      "minItems": 1,
      "maxItems": 500,
      "items": {
        "type": "object",
        "properties": {
          "itemId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "quantity": {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          }
        },
        "required": [
          "itemId",
          "quantity"
        ],
        "additionalProperties": false
      }
    },
    "retainedPlanId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "retainedSequence": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "properties": {
          "taskId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          },
          "attemptId": {
            "$ref": "common.schema.json#/$defs/Uuid"
          }
        },
        "required": [
          "taskId",
          "attemptId"
        ],
        "additionalProperties": false
      }
    },
    "pausedActivity": {
      "anyOf": [
        {
          "$ref": "#/$defs/Activity"
        },
        {
          "type": "null"
        }
      ]
    },
    "heading": {
      "$ref": "#/$defs/ActionTime"
    },
    "arrival": {
      "anyOf": [
        {
          "$ref": "#/$defs/ActionTime"
        },
        {
          "type": "null"
        }
      ]
    },
    "resumed": {
      "anyOf": [
        {
          "$ref": "#/$defs/ActionTime"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "segmentId",
    "roundId",
    "requestId",
    "sourceBranchId",
    "revision",
    "stage",
    "coordinates",
    "serviceEstimateSeconds",
    "claims",
    "retainedPlanId",
    "retainedSequence",
    "pausedActivity",
    "heading",
    "arrival",
    "resumed"
  ],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "stage": {
            "enum": [
              "arrived",
              "resumed"
            ]
          }
        },
        "required": [
          "stage"
        ]
      },
      "then": {
        "properties": {
          "arrival": {
            "$ref": "#/$defs/ActionTime"
          }
        }
      },
      "else": {
        "properties": {
          "arrival": {
            "type": "null"
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "stage": {
            "const": "resumed"
          }
        },
        "required": [
          "stage"
        ]
      },
      "then": {
        "properties": {
          "resumed": {
            "$ref": "#/$defs/ActionTime"
          }
        }
      },
      "else": {
        "properties": {
          "resumed": {
            "type": "null"
          }
        }
      }
    }
  ]
}
```

### B2bRedispatch

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/Redispatch)

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "previousDispatchCycleId": {
      "$ref": "./common.schema.json#/$defs/Uuid"
    },
    "snapshot": {
      "$ref": "#/$defs/SourceSnapshot"
    }
  },
  "required": [
    "externalId",
    "previousDispatchCycleId",
    "snapshot"
  ],
  "additionalProperties": false
}
```

### B2bRedispatchCommand

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/RedispatchCommand)

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
          "const": "dispatch.createFromReceipt"
        },
        "context": {
          "$ref": "./common.schema.json#/$defs/IntegrationContext"
        },
        "payload": {
          "$ref": "#/$defs/Redispatch"
        }
      },
      "required": [
        "operationId",
        "context",
        "payload"
      ]
    }
  ]
}
```

### B2bCycleList

[Canonical definition](../../contracts/b2b-intake.schema.json#/$defs/CycleList)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "$ref": "#/$defs/Task"
      }
    },
    "nextCursor": {
      "anyOf": [
        {
          "$ref": "./common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "items",
    "nextCursor"
  ],
  "additionalProperties": false
}
```

### CorrectionReplacement

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Replacement)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "outcome": {
          "const": "full"
        },
        "reportedCollection": {
          "$ref": "outcomes.schema.json#/$defs/Money"
        }
      },
      "required": [
        "outcome"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "outcome": {
          "const": "partial"
        },
        "pieces": {
          "type": "array",
          "items": {
            "$ref": "outcomes.schema.json#/$defs/Piece"
          },
          "minItems": 1,
          "maxItems": 100
        },
        "reportedCollection": {
          "$ref": "outcomes.schema.json#/$defs/Money"
        }
      },
      "required": [
        "outcome",
        "pieces",
        "reportedCollection"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "outcome": {
          "const": "refused"
        },
        "reportedCollection": {
          "$ref": "outcomes.schema.json#/$defs/Money"
        },
        "shippingPayment": {
          "enum": [
            "collected",
            "refused"
          ]
        }
      },
      "required": [
        "outcome"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "outcome": {
          "const": "no-answer"
        }
      },
      "required": [
        "outcome"
      ],
      "additionalProperties": false
    }
  ]
}
```

### CorrectionCorrect

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Correct)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "expectedOutcomeRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "replacement": {
      "$ref": "#/$defs/Replacement"
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "expectedOutcomeRevision",
    "replacement"
  ],
  "additionalProperties": false
}
```

### CorrectionCorrectCommand

[Canonical definition](../../contracts/corrections.schema.json#/$defs/CorrectCommand)

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
          "const": "outcome.correct"
        },
        "context": {
          "type": "object",
          "properties": {
            "kind": {
              "const": "device"
            }
          }
        },
        "payload": {
          "$ref": "#/$defs/Correct"
        }
      }
    }
  ]
}
```

### CorrectionConstraint

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Constraint)

```json
{
  "enum": [
    "closed-workday",
    "dependent-receipt",
    "dependent-redispatch",
    "changed-assignment",
    "changed-source",
    "changed-attempt",
    "not-current-owner",
    "correction-not-authorized",
    "outcome-required",
    "claimed-handover"
  ]
}
```

### CorrectionAvailability

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Availability)

```json
{
  "type": "object",
  "properties": {
    "roundId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "taskId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "attemptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "effectiveOutcomeRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "effectiveOutcome": {
      "anyOf": [
        {
          "$ref": "outcomes.schema.json#/$defs/Record"
        },
        {
          "type": "null"
        }
      ]
    },
    "allowed": {
      "type": "boolean"
    },
    "constraints": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/Constraint"
      }
    },
    "nextSteps": {
      "type": "array",
      "items": {
        "enum": [
          "refresh-state",
          "view-history",
          "erp-commercial-review"
        ]
      }
    },
    "message": {
      "type": "string",
      "minLength": 1
    },
    "delivery": {
      "$ref": "current-activity.schema.json#/$defs/DeliveryAffordance",
      "description": "Frozen replacement choices and exact amounts excluding this attempt from prior collections. Choices do not override availability.allowed."
    },
    "originalOutcome": {
      "anyOf": [
        {
          "$ref": "outcomes.schema.json#/$defs/Record"
        },
        {
          "type": "null"
        }
      ],
      "description": "First recorded result for this attempt; effectiveOutcome retains the latest correction."
    },
    "executionRoundId": {
      "$ref": "common.schema.json#/$defs/Uuid",
      "description": "Latest round anchoring current device ownership, generation and snapshot token; roundId remains the original outcome round."
    }
  },
  "required": [
    "roundId",
    "taskId",
    "attemptId",
    "effectiveOutcomeRevision",
    "effectiveOutcome",
    "allowed",
    "constraints",
    "nextSteps",
    "message"
  ],
  "additionalProperties": false
}
```

### CorrectionRecord

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Record)

```json
{
  "type": "object",
  "properties": {
    "correctionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "previousOutcomeId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "previousRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "outcome": {
      "$ref": "outcomes.schema.json#/$defs/Record"
    },
    "evidenceActionId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "evidenceReceiptId": {
      "anyOf": [
        {
          "$ref": "common.schema.json#/$defs/Uuid"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "correctionId",
    "previousOutcomeId",
    "previousRevision",
    "outcome",
    "evidenceActionId",
    "evidenceReceiptId"
  ],
  "additionalProperties": false
}
```

### CorrectionResult

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Result)

```json
{
  "type": "object",
  "properties": {
    "correction": {
      "$ref": "#/$defs/Record"
    }
  },
  "required": [
    "correction"
  ],
  "additionalProperties": false
}
```

### CorrectionEvent

[Canonical definition](../../contracts/corrections.schema.json#/$defs/Event)

```json
{
  "type": "object",
  "properties": {
    "correction": {
      "$ref": "#/$defs/Record"
    },
    "previousOutcome": {
      "anyOf": [
        {
          "$ref": "outcomes.schema.json#/$defs/Record"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "correction",
    "previousOutcome"
  ],
  "additionalProperties": false
}
```

### CorrectionAdoptionEvent

[Canonical definition](../../contracts/corrections.schema.json#/$defs/AdoptionEvent)

```json
{
  "type": "object",
  "properties": {
    "evidenceActionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "evidenceReceiptId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "correctionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "outcomeId": {
      "$ref": "common.schema.json#/$defs/Uuid"
    },
    "outcomeRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "evidenceActionId",
    "evidenceReceiptId",
    "correctionId",
    "outcomeId",
    "outcomeRevision"
  ],
  "additionalProperties": false
}
```

### CorrectionActionResult

[Canonical definition](../../contracts/corrections.schema.json#/$defs/ActionResult)

```json
{
  "$ref": "action-result.v1.schema.json"
}
```

### CorrectionActionStatus

[Canonical definition](../../contracts/corrections.schema.json#/$defs/ActionStatus)

```json
{
  "type": "object",
  "properties": {
    "actionId": {
      "$ref": "common.schema.json#/$defs/Uuid"
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
      "$ref": "#/$defs/ActionResult"
    }
  },
  "required": [
    "actionId",
    "status"
  ],
  "additionalProperties": false
}
```

### MonitoringChange

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Change)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "recordedAt": {
      "type": "string",
      "format": "date-time"
    },
    "correlationId": {
      "type": "string"
    }
  },
  "required": [
    "recordedAt",
    "correlationId"
  ]
}
```

### MonitoringFreshness

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Freshness)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "refreshedAt": {
      "type": "string",
      "format": "date-time"
    },
    "receivedEvidenceOnly": {
      "const": true
    },
    "deviceContactAt": {
      "type": "null"
    },
    "lastReceivedActionAt": {
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
    "integrationDelivery": {
      "const": "unavailable"
    }
  },
  "required": [
    "refreshedAt",
    "receivedEvidenceOnly",
    "deviceContactAt",
    "lastReceivedActionAt",
    "integrationDelivery"
  ]
}
```

### MonitoringProgress

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Progress)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "shipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "attempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "processedAttempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "processedShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "fullDeliveredShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "partialShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "failedShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "remainingShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "shipments",
    "attempts",
    "processedAttempts",
    "processedShipments",
    "fullDeliveredShipments",
    "partialShipments",
    "failedShipments",
    "remainingShipments"
  ]
}
```

### MonitoringGroups

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Groups)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "preparedShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "heldShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "deferredShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "returnRequiredShipments": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "heldPieces": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "returnRequiredPieces": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "preparedShipments",
    "heldShipments",
    "deferredShipments",
    "returnRequiredShipments",
    "heldPieces",
    "returnRequiredPieces"
  ]
}
```

### MonitoringRound

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Round)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "roundId": {
      "type": "string",
      "format": "uuid"
    },
    "workdayId": {
      "type": "string",
      "format": "uuid"
    },
    "startedAt": {
      "type": "string",
      "format": "date-time"
    },
    "endedAt": {
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
    "roundId",
    "workdayId",
    "startedAt",
    "endedAt"
  ]
}
```

### MonitoringWorkday

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Workday)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "workdayId": {
      "type": "string",
      "format": "uuid"
    },
    "openedAt": {
      "type": "string",
      "format": "date-time"
    },
    "endedAt": {
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
    "workdayId",
    "openedAt",
    "endedAt"
  ]
}
```

### MonitoringTask

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Task)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "taskId": {
      "type": "string",
      "format": "uuid"
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "attemptId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "branchId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "integrationId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
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
    "recipientName": {
      "type": "string"
    },
    "recipientPhone": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
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
    "state": {
      "enum": [
        "prepared",
        "held",
        "unassigned",
        "withdrawn",
        "personal"
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
    "deferred": {
      "type": "boolean"
    },
    "outcome": {
      "anyOf": [
        {
          "enum": [
            "full",
            "partial",
            "refused",
            "no-answer"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "outcomeRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "heldPieces": {
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
    "returnRequiredPieces": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "eligible": {
      "type": "boolean"
    }
  },
  "required": [
    "taskId",
    "dispatchCycleId",
    "attemptId",
    "branchId",
    "integrationId",
    "sourceRevision",
    "assignmentRevision",
    "recipientName",
    "recipientPhone",
    "coordinates",
    "state",
    "earliestAt",
    "deferred",
    "outcome",
    "outcomeRevision",
    "heldPieces",
    "returnRequiredPieces",
    "eligible"
  ]
}
```

### MonitoringCurrent

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Current)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "kind": {
      "enum": [
        "customer",
        "branch"
      ]
    },
    "taskId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "attemptId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "branchId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "stage": {
      "enum": [
        "heading",
        "arrived",
        "awaiting-receipt"
      ]
    }
  },
  "required": [
    "kind",
    "taskId",
    "attemptId",
    "branchId",
    "stage"
  ]
}
```

### MonitoringPlan

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Plan)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "planId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "revision": {
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
    "orderedTaskIds": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid"
      }
    }
  },
  "required": [
    "planId",
    "revision",
    "orderedTaskIds"
  ]
}
```

### MonitoringOwner

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Owner)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "accountId": {
      "type": "string",
      "format": "uuid"
    },
    "deviceId": {
      "type": "string",
      "format": "uuid"
    },
    "generation": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "accountId",
    "deviceId",
    "generation"
  ]
}
```

### MonitoringAction

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Action)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "sourceId": {
      "type": "string",
      "format": "uuid"
    },
    "actionId": {
      "type": "string",
      "format": "uuid"
    },
    "operationId": {
      "type": "string"
    },
    "receivedAt": {
      "type": "string",
      "format": "date-time"
    },
    "acceptedAt": {
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
    "businessStatus": {
      "enum": [
        "accepted",
        "rejected",
        "review-required"
      ]
    }
  },
  "required": [
    "sourceId",
    "actionId",
    "operationId",
    "receivedAt",
    "acceptedAt",
    "businessStatus"
  ]
}
```

### MonitoringCycle

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Cycle)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "dispatchCycleId": {
      "type": "string",
      "format": "uuid"
    },
    "taskId": {
      "type": "string",
      "format": "uuid"
    },
    "driverId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
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
    "state": {
      "enum": [
        "unassigned",
        "prepared",
        "held",
        "withdrawn"
      ]
    },
    "receivedAt": {
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
    "latest": {
      "type": "boolean"
    }
  },
  "required": [
    "dispatchCycleId",
    "taskId",
    "driverId",
    "sourceRevision",
    "assignmentRevision",
    "state",
    "receivedAt",
    "departureAt",
    "latest"
  ]
}
```

### MonitoringAttempt

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Attempt)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "attemptId": {
      "type": "string",
      "format": "uuid"
    },
    "taskId": {
      "type": "string",
      "format": "uuid"
    },
    "roundId": {
      "type": "string",
      "format": "uuid"
    },
    "dispatchCycleId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid"
        },
        {
          "type": "null"
        }
      ]
    },
    "admittedAt": {
      "type": "string",
      "format": "date-time"
    },
    "stage": {
      "enum": [
        "available",
        "heading",
        "arrived",
        "paused",
        "resolved"
      ]
    }
  },
  "required": [
    "attemptId",
    "taskId",
    "roundId",
    "dispatchCycleId",
    "admittedAt",
    "stage"
  ]
}
```

### MonitoringHistoryItem

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/HistoryItem)

```json
{
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "outcome"
        },
        "outcome": {
          "$ref": "outcomes.schema.json#/$defs/Record"
        },
        "effective": {
          "type": "boolean"
        }
      },
      "required": [
        "kind",
        "outcome",
        "effective"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "correction"
        },
        "correction": {
          "$ref": "corrections.schema.json#/$defs/Record"
        }
      },
      "required": [
        "kind",
        "correction"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "cycle"
        },
        "cycle": {
          "$ref": "#/$defs/Cycle"
        }
      },
      "required": [
        "kind",
        "cycle"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "attempt"
        },
        "attempt": {
          "$ref": "#/$defs/Attempt"
        }
      },
      "required": [
        "kind",
        "attempt"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "action"
        },
        "action": {
          "$ref": "#/$defs/Action"
        }
      },
      "required": [
        "kind",
        "action"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "round"
        },
        "round": {
          "$ref": "#/$defs/Round"
        }
      },
      "required": [
        "kind",
        "round"
      ]
    }
  ]
}
```

### MonitoringSnapshot

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/Snapshot)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "scopeKey": {
      "type": "string"
    },
    "snapshotRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "lastCommittedChange": {
      "anyOf": [
        {
          "$ref": "#/$defs/Change"
        },
        {
          "type": "null"
        }
      ]
    },
    "freshness": {
      "$ref": "#/$defs/Freshness"
    },
    "nextCursor": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "driverId": {
      "type": "string",
      "format": "uuid"
    },
    "workday": {
      "anyOf": [
        {
          "$ref": "#/$defs/Workday"
        },
        {
          "type": "null"
        }
      ]
    },
    "round": {
      "anyOf": [
        {
          "$ref": "#/$defs/Round"
        },
        {
          "type": "null"
        }
      ]
    },
    "current": {
      "anyOf": [
        {
          "$ref": "#/$defs/Current"
        },
        {
          "type": "null"
        }
      ]
    },
    "nextSuggestion": {
      "anyOf": [
        {
          "$ref": "#/$defs/Task"
        },
        {
          "type": "null"
        }
      ]
    },
    "plan": {
      "$ref": "#/$defs/Plan"
    },
    "owner": {
      "anyOf": [
        {
          "$ref": "#/$defs/Owner"
        },
        {
          "type": "null"
        }
      ]
    },
    "progress": {
      "$ref": "#/$defs/Progress"
    },
    "groups": {
      "$ref": "#/$defs/Groups"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Task"
      }
    }
  },
  "required": [
    "scopeKey",
    "snapshotRevision",
    "lastCommittedChange",
    "freshness",
    "nextCursor",
    "driverId",
    "workday",
    "round",
    "current",
    "nextSuggestion",
    "plan",
    "owner",
    "progress",
    "groups",
    "items"
  ]
}
```

### MonitoringHistory

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/History)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "scopeKey": {
      "type": "string"
    },
    "snapshotRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "lastCommittedChange": {
      "anyOf": [
        {
          "$ref": "#/$defs/Change"
        },
        {
          "type": "null"
        }
      ]
    },
    "freshness": {
      "$ref": "#/$defs/Freshness"
    },
    "nextCursor": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "resourceId": {
      "type": "string",
      "format": "uuid"
    },
    "progress": {
      "anyOf": [
        {
          "$ref": "#/$defs/Progress"
        },
        {
          "type": "null"
        }
      ]
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/HistoryItem"
      }
    }
  },
  "required": [
    "scopeKey",
    "snapshotRevision",
    "lastCommittedChange",
    "freshness",
    "nextCursor",
    "resourceId",
    "progress",
    "items"
  ]
}
```

### MonitoringActionSnapshot

[Canonical definition](../../contracts/monitoring.schema.json#/$defs/ActionSnapshot)

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "scopeKey": {
      "type": "string"
    },
    "snapshotRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "lastCommittedChange": {
      "anyOf": [
        {
          "$ref": "#/$defs/Change"
        },
        {
          "type": "null"
        }
      ]
    },
    "freshness": {
      "$ref": "#/$defs/Freshness"
    },
    "nextCursor": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "action": {
      "$ref": "#/$defs/Action"
    }
  },
  "required": [
    "scopeKey",
    "snapshotRevision",
    "lastCommittedChange",
    "freshness",
    "nextCursor",
    "action"
  ]
}
```

## Validated examples

Examples include designed fixtures and captured local API results; consult contracts/examples/README.md and the phase evidence for provenance. Schema validation alone is not runtime proof. Invalid cases are rejection fixtures, not requests to a live service.

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
| p14-partial-urgent | planning.schema.json#/$defs/Plan | valid foundation shape |
| p14-ready | planning.schema.json#/$defs/Plan | valid foundation shape |
| p14-manual | planning.schema.json#/$defs/Plan | valid foundation shape |
| p14-manual-order | planning.schema.json#/$defs/ManualOrderCommand | valid foundation shape |
| p14-manual-first | planning.schema.json#/$defs/ManualOrderCommand | valid foundation shape |
| p15-readiness | round-start.schema.json#/$defs/Readiness | valid foundation shape |
| p15-start | round-start.schema.json#/$defs/StartCommand | valid foundation shape |
| p15-current | round-start.schema.json#/$defs/Current | valid foundation shape |
| p15-start-result | round-start.schema.json#/$defs/StartResult | valid foundation shape |
| p15-action-accepted | round-start.schema.json#/$defs/ActionStatus | valid foundation shape |
| p15-action-pending | round-start.schema.json#/$defs/ActionStatus | valid foundation shape |
| p15-action-rejected | round-start.schema.json#/$defs/ActionStatus | valid foundation shape |
| current-heading | current-activity.schema.json#/$defs/Activity | valid foundation shape |
| current-arrived | current-activity.schema.json#/$defs/Activity | valid foundation shape |
| current-manual-origin | current-activity.schema.json#/$defs/PhysicalOrigin | valid foundation shape |
| p16-select-heading | current-activity.schema.json#/$defs/SelectHeadingCommand | valid foundation shape |
| p16-arrival | current-activity.schema.json#/$defs/ArrivalCommand | valid foundation shape |
| p16-correct-origin | current-activity.schema.json#/$defs/CorrectOriginCommand | valid foundation shape |
| p16-heading-action-accepted | current-activity.schema.json#/$defs/ActionStatus | valid foundation shape |
| p16-action-pending | current-activity.schema.json#/$defs/ActionStatus | valid foundation shape |
| p16-arrival-action-accepted | current-activity.schema.json#/$defs/ActionStatus | valid foundation shape |
| p16-snapshot-arrived | current-activity.schema.json#/$defs/Snapshot | valid foundation shape |
| p17-full-command | outcomes.schema.json#/$defs/FullCommand | valid foundation shape |
| p17-partial-command | outcomes.schema.json#/$defs/PartialCommand | valid foundation shape |
| p17-refused-paid-command | outcomes.schema.json#/$defs/RefusalCommand | valid foundation shape |
| p17-refused-unpaid-command | outcomes.schema.json#/$defs/RefusalCommand | valid foundation shape |
| p17-no-answer-command | outcomes.schema.json#/$defs/NoAnswerCommand | valid foundation shape |
| p17-partial-record | outcomes.schema.json#/$defs/Record | valid foundation shape |
| p17-no-answer-record | outcomes.schema.json#/$defs/Record | valid foundation shape |
| p17-two-task-progress | outcomes.schema.json#/$defs/Snapshot | valid foundation shape |
| p17-action-accepted | outcomes.schema.json#/$defs/ActionStatus | valid foundation shape |
| p17-action-pending | outcomes.schema.json#/$defs/ActionStatus | valid foundation shape |
| p17-event-payload | outcomes.schema.json#/$defs/Event | valid foundation shape |
| p18-retry-command | eligibility.schema.json#/$defs/RetryCommand | valid foundation shape |
| p18-defer-command | eligibility.schema.json#/$defs/DeferCommand | valid foundation shape |
| p18-urgency-command | eligibility.schema.json#/$defs/UrgencyCommand | valid foundation shape |
| p18-activate-command | eligibility.schema.json#/$defs/ActivateCommand | valid foundation shape |
| p18-snapshot | eligibility.schema.json#/$defs/Snapshot | valid foundation shape |
| p18-action-status | eligibility.schema.json#/$defs/ActionStatus | valid foundation shape |
| p18-pending | eligibility.schema.json#/$defs/ActionStatus | valid foundation shape |
| p18-accepted | eligibility.schema.json#/$defs/ActionResult | valid foundation shape |
| p18-denied | eligibility.schema.json#/$defs/ActionResult | valid foundation shape |
| p18-event-0 | eligibility.schema.json#/$defs/Event | valid foundation shape |
| p18-event-1 | eligibility.schema.json#/$defs/Event | valid foundation shape |
| p18-event-2 | eligibility.schema.json#/$defs/Event | valid foundation shape |
| p18-state | eligibility.schema.json#/$defs/State | valid foundation shape |
| p18-record | eligibility.schema.json#/$defs/Record | valid foundation shape |
| p19-end-round | workday-closure.schema.json#/$defs/EndRoundCommand | valid foundation shape |
| p19-end-day | workday-closure.schema.json#/$defs/EndDayCommand | valid foundation shape |
| p19-round-result | workday-closure.schema.json#/$defs/ActionResult | valid foundation shape |
| p19-day-result | workday-closure.schema.json#/$defs/ActionResult | valid foundation shape |
| p19-action-status | workday-closure.schema.json#/$defs/ActionStatus | valid foundation shape |
| p19-summary | workday-closure.schema.json#/$defs/Summary | valid foundation shape |
| p19-carry-forward | workday-closure.schema.json#/$defs/CarryForward | valid foundation shape |
| p19-round-event | workday-closure.schema.json#/$defs/Event | valid foundation shape |
| p19-day-event | workday-closure.schema.json#/$defs/Event | valid foundation shape |
| p19-pending | workday-closure.schema.json#/$defs/ActionStatus | valid foundation shape |
| p20-view | device-ownership.schema.json#/$defs/Context | valid foundation shape |
| p20-takeover-command | device-ownership.schema.json#/$defs/TakeoverCommand | valid foundation shape |
| p20-action-status | device-ownership.schema.json#/$defs/ActionStatus | valid foundation shape |
| p20-takeover-result | action-result.v1.schema.json | valid foundation shape |
| p20-snapshot | device-ownership.schema.json#/$defs/Snapshot | valid foundation shape |
| p20-received | device-ownership.schema.json#/$defs/EvidenceSubmissionResult | valid foundation shape |
| p20-duplicate | device-ownership.schema.json#/$defs/EvidenceSubmissionResult | valid foundation shape |
| p20-evidence | device-ownership.schema.json#/$defs/Evidence | valid foundation shape |
| p20-former-outcome | device-ownership.schema.json#/$defs/FormerSubmission | valid foundation shape |
| p20-adoption-designed-only | device-ownership.schema.json#/$defs/AdoptionCommand | valid foundation shape |
| p20-notification-1 | device-ownership.schema.json#/$defs/TransferEvent | valid foundation shape |
| p20-notification-2 | device-ownership.schema.json#/$defs/EvidenceEvent | valid foundation shape |
| p20-notification-3 | device-ownership.schema.json#/$defs/EvidenceEvent | valid foundation shape |
| p21-offer-command | returns.schema.json#/$defs/RequestCommand | valid foundation shape |
| p21-receive-command | returns.schema.json#/$defs/ReceiveCommand | valid foundation shape |
| p21-loss-command | returns.schema.json#/$defs/DisposeCommand | valid foundation shape |
| p21-offered | returns.schema.json#/$defs/RequestView | valid foundation shape |
| p21-received | returns.schema.json#/$defs/RequestView | valid foundation shape |
| p21-disposed | returns.schema.json#/$defs/RequestView | valid foundation shape |
| p21-waiting | returns.schema.json#/$defs/Confirmation | valid foundation shape |
| p21-confirmed | returns.schema.json#/$defs/Confirmation | valid foundation shape |
| p21-unconfirmed | returns.schema.json#/$defs/Confirmation | valid foundation shape |
| p21-requested | returns.schema.json#/$defs/RequestedEvent | valid foundation shape |
| p21-subsetReceived | returns.schema.json#/$defs/ReceivedEvent | valid foundation shape |
| p21-dispositionRecorded | returns.schema.json#/$defs/DispositionEvent | valid foundation shape |
| p21-accepted | returns.schema.json#/$defs/ActionResult | valid foundation shape |
| p21-recovered | returns.schema.json#/$defs/ActionStatus | valid foundation shape |
| p22-interrupt | branch-activity.schema.json#/$defs/InterruptCommand | valid foundation shape |
| p22-arrive | branch-activity.schema.json#/$defs/ArrivalCommand | valid foundation shape |
| p22-resume | branch-activity.schema.json#/$defs/ResumeCommand | valid foundation shape |
| p22-redispatch | b2b-intake.schema.json#/$defs/RedispatchCommand | valid foundation shape |
| p22-cycles | b2b-intake.schema.json#/$defs/CycleList | valid foundation shape |
| p22-resumed-current | current-activity.schema.json#/$defs/Snapshot | valid foundation shape |
| p22-interrupted | branch-activity.schema.json#/$defs/Result | valid foundation shape |
| p22-arrived | branch-activity.schema.json#/$defs/Result | valid foundation shape |
| p22-resumed | branch-activity.schema.json#/$defs/Result | valid foundation shape |
| p22-event-0 | branch-activity.schema.json#/$defs/Event | valid foundation shape |
| p22-event-1 | branch-activity.schema.json#/$defs/Event | valid foundation shape |
| p22-event-2 | b2b-intake.schema.json#/$defs/ChangedEvent | valid foundation shape |
| p22-event-3 | branch-activity.schema.json#/$defs/Event | valid foundation shape |
| p23-correct-one-piece | corrections.schema.json#/$defs/CorrectCommand | valid foundation shape |
| p23-captured-outcome.corrected-0 | corrections.schema.json#/$defs/Event | valid foundation shape |
| p23-captured-outcome.corrected-1 | corrections.schema.json#/$defs/Event | valid foundation shape |
| p23-captured-evidence.adoptionResolved-2 | corrections.schema.json#/$defs/AdoptionEvent | valid foundation shape |
| p23-receipt-denied-availability | corrections.schema.json#/$defs/Availability | valid foundation shape |
| monitoring-scoped | monitoring.schema.json#/$defs/Snapshot | valid foundation shape |
| monitoring-own | monitoring.schema.json#/$defs/Snapshot | valid foundation shape |
| monitoring-corrected | monitoring.schema.json#/$defs/Snapshot | valid foundation shape |
| monitoring-history | monitoring.schema.json#/$defs/History | valid foundation shape |
| monitoring-workday | monitoring.schema.json#/$defs/History | valid foundation shape |
| p25-provisioning.changed | events/sender-event.v1.schema.json | valid foundation shape |
| p25-task.snapshotAccepted | events/sender-event.v1.schema.json | valid foundation shape |
| p25-assignment.received | events/sender-event.v1.schema.json | valid foundation shape |
| p25-round.started | events/sender-event.v1.schema.json | valid foundation shape |
| p25-outcome.recorded | events/sender-event.v1.schema.json | valid foundation shape |
| p25-outcome.corrected | events/sender-event.v1.schema.json | valid foundation shape |
| p25-return.requested | events/sender-event.v1.schema.json | valid foundation shape |
| p25-return.subsetReceived | events/sender-event.v1.schema.json | valid foundation shape |
| p25-plan.revisionPublished | events/sender-event.v1.schema.json | valid foundation shape |
| p25-queue-received | outbox.schema.json#/$defs/Queue | valid foundation shape |
| p25-receipt-only | outbox.schema.json#/$defs/Acknowledgement | valid foundation shape |
| p26-captured-current-task-0 | consumer.schema.json#/$defs/Snapshot | valid foundation shape |
| p26-captured-current-integration-1 | consumer.schema.json#/$defs/Snapshot | valid foundation shape |
| p26-captured-current-task-2 | consumer.schema.json#/$defs/Snapshot | valid foundation shape |
| p26-captured-current-trip-3 | consumer.schema.json#/$defs/Snapshot | valid foundation shape |
| p26-captured-current-return-request-4 | consumer.schema.json#/$defs/Snapshot | valid foundation shape |
| p26-captured-applied-report-0 | consumer.schema.json#/$defs/ReportRead | valid foundation shape |
| p26-captured-applied-report-1 | consumer.schema.json#/$defs/ReportRead | valid foundation shape |
| p26-captured-applied-report-2 | consumer.schema.json#/$defs/ReportRead | valid foundation shape |
| p26-captured-applied-report-3 | consumer.schema.json#/$defs/ReportRead | valid foundation shape |
| p26-captured-applied-report-4 | consumer.schema.json#/$defs/ReportRead | valid foundation shape |
| p26-captured-consumer-status | consumer.schema.json#/$defs/Status | valid foundation shape |
| p26-report-command-fixture | consumer.schema.json#/$defs/ReportCommand | valid foundation shape |
| p27-source-pending | source.schema.json#/$defs/Status | valid foundation shape |
| p27-source-completed-capture | source.schema.json#/$defs/Status | valid foundation shape |
| p30-frozen-piece-delivery | current-activity.schema.json#/$defs/DeliveryAffordance | valid foundation shape |
| p30-correction-view-retained-original | corrections.schema.json#/$defs/Availability | valid foundation shape |
| p31-recovered-pending-requests | returns.schema.json#/$defs/Groups | valid foundation shape |
| p31-ended-round-activity-revision | workday-closure.schema.json#/$defs/RoundSummary | valid foundation shape |
| local-started-download-v1 | local-work.schema.json#/$defs/Download | valid foundation shape |
| local-immutable-capture-v1 | local-work.schema.json#/$defs/Action | valid foundation shape |
| p33-plan-with-downloaded-road-context | planning.schema.json#/$defs/Plan | valid foundation shape |
| p34-batch | sync.schema.json#/$defs/Batch | valid foundation shape |
| p34-waiting | sync.schema.json#/$defs/Entry | valid foundation shape |
| p34-mixed-results | sync.schema.json#/$defs/BatchResult | valid foundation shape |
| p34-conflicts-empty | sync.schema.json#/$defs/Conflicts | valid foundation shape |
| p35-same-account-recovery-fixture | session.schema.json#/$defs/LoginRequest | valid foundation shape |
| p35-sealed-selection-fixture | local-work.schema.json#/$defs/Selection | valid foundation shape |
| p35-scoped-form-draft-fixture | local-work.schema.json#/$defs/Draft | valid foundation shape |
| report-Counts | reporting.schema.json#/$defs/Counts | valid foundation shape |
| report-Collection | reporting.schema.json#/$defs/Collection | valid foundation shape |
| report-Time | reporting.schema.json#/$defs/Time | valid foundation shape |
| report-Measurement | reporting.schema.json#/$defs/Measurement | valid foundation shape |
| report-Filters | reporting.schema.json#/$defs/Filters | valid foundation shape |
| report-Pieces | reporting.schema.json#/$defs/Pieces | valid foundation shape |
| diagnostics-health-valid | diagnostics.schema.json#/$defs/Health | valid foundation shape |
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
| p13-fake-active | planning.schema.json#/$defs/Plan | invalid (enum) |
| p13-fake-policy | planning.schema.json#/$defs/Plan | invalid (const) |
| p13-gps-origin | planning.schema.json#/$defs/Settings | invalid (const) |
| p13-missing-attempt | planning.schema.json#/$defs/Input | invalid (required) |
| p13-fake-status | planning.schema.json#/$defs/Job | invalid (enum) |
| p13-negative-revision | planning.schema.json#/$defs/SaveDraftCommand | invalid (minimum) |
| p13-impossible-complete | planning.schema.json#/$defs/Job | invalid (type) |
| p13-impossible-running | planning.schema.json#/$defs/Job | invalid (type) |
| p14-manual-fake-road | planning.schema.json#/$defs/Plan | invalid (type) |
| p14-partial-ready | planning.schema.json#/$defs/Plan | invalid (const) |
| p14-manual-eta | planning.schema.json#/$defs/Plan | invalid (type) |
| p14-no-policy | planning.schema.json#/$defs/Plan | invalid (const) |
| p14-duplicate-manual | planning.schema.json#/$defs/ManualOrderCommand | invalid (uniqueItems) |
| p15-no-client-sync-flag | round-start.schema.json#/$defs/StartCommand | invalid (additionalProperties) |
| p15-local-draft-not-active | round-start.schema.json#/$defs/Round | invalid (const) |
| arrived-without-recorded-action | current-activity.schema.json#/$defs/Activity | invalid (type) |
| heading-with-inferred-arrival | current-activity.schema.json#/$defs/Activity | invalid (type) |
| current-next-is-not-stage | current-activity.schema.json#/$defs/Activity | invalid (enum) |
| p16-no-arbitrary-selection | current-activity.schema.json#/$defs/SelectHeadingCommand | invalid (required) |
| p16-arrival-must-identify-current | current-activity.schema.json#/$defs/ArrivalCommand | invalid (type) |
| p17-invalid-fraction | outcomes.schema.json#/$defs/PartialCommand | invalid (type) |
| p17-invalid-negative | outcomes.schema.json#/$defs/PartialCommand | invalid (minimum) |
| p17-invalid-unsafe-money | outcomes.schema.json#/$defs/FullCommand | invalid (maximum) |
| p17-invalid-unlike-currency | outcomes.schema.json#/$defs/FullCommand | invalid (const) |
| p17-invalid-no-answer-fee-refusal | outcomes.schema.json#/$defs/NoAnswerCommand | invalid (additionalProperties) |
| p17-invalid-no-answer-arrival | outcomes.schema.json#/$defs/NoAnswerCommand | invalid (additionalProperties) |
| p17-no-answer-fabricated-collection | outcomes.schema.json#/$defs/Record | invalid (type) |
| p17-personal-piece-result | outcomes.schema.json#/$defs/Record | invalid (maxItems) |
| p18-call-counter | eligibility.schema.json#/$defs/RetryCommand | invalid (additionalProperties) |
| p18-negative-revision | eligibility.schema.json#/$defs/RetryCommand | invalid (minimum) |
| p18-fractional-revision | eligibility.schema.json#/$defs/RetryCommand | invalid (type) |
| p18-overflow-revision | eligibility.schema.json#/$defs/RetryCommand | invalid (maximum) |
| p18-appointment-window | eligibility.schema.json#/$defs/RetryCommand | invalid (additionalProperties) |
| p18-bad-date | eligibility.schema.json#/$defs/DeferCommand | invalid (format) |
| p18-bad-urgency | eligibility.schema.json#/$defs/UrgencyCommand | invalid (enum) |
| p18-missing-revision | eligibility.schema.json#/$defs/RetryCommand | invalid (required) |
| p18-operation-mismatch | eligibility.schema.json#/$defs/RetryCommand | invalid (const) |
| p19-missing-current-choice | workday-closure.schema.json#/$defs/EndDayCommand | invalid (required) |
| p19-fabricated-settlement | workday-closure.schema.json#/$defs/EndDayCommand | invalid (additionalProperties) |
| p19-round-without-active-expectation | workday-closure.schema.json#/$defs/EndRoundCommand | invalid (type) |
| p19-negative-revision | workday-closure.schema.json#/$defs/EndRoundCommand | invalid (minimum) |
| p19-non-utc-server-time | workday-closure.schema.json#/$defs/Record | invalid (pattern) |
| p19-negative-denominator | workday-closure.schema.json#/$defs/Summary | invalid (minimum) |
| p19-deferred-cannot-be-executable | workday-closure.schema.json#/$defs/CarryItem | invalid (type) |
| p19-closure-not-receipt | workday-closure.schema.json#/$defs/Event | invalid (additionalProperties) |
| p20-takeover-missing-generation | device-ownership.schema.json#/$defs/TakeoverCommand | invalid (required) |
| p20-takeover-staff-override | device-ownership.schema.json#/$defs/TakeoverCommand | invalid (additionalProperties) |
| p20-takeover-client-time-winner | device-ownership.schema.json#/$defs/TakeoverCommand | invalid (additionalProperties) |
| p20-takeover-fraction-generation | device-ownership.schema.json#/$defs/TakeoverCommand | invalid (type) |
| p20-bad-snapshot-token | device-ownership.schema.json#/$defs/FormerSubmission | invalid (format) |
| p20-adoption-no-receipt | device-ownership.schema.json#/$defs/AdoptionCommand | invalid (required) |
| p21-fractional-receipt | returns.schema.json#/$defs/ReceiveCommand | invalid (type) |
| p21-empty-subset | returns.schema.json#/$defs/ReceiveCommand | invalid (minItems) |
| p21-forged-human | returns.schema.json#/$defs/ReceiveCommand | invalid (additionalProperties) |
| p21-stock-claim | returns.schema.json#/$defs/ReceiveCommand | invalid (additionalProperties) |
| p21-receipt-as-loss | returns.schema.json#/$defs/ReceivedEvent | invalid (const) |
| p21-loss-as-receipt | returns.schema.json#/$defs/DispositionEvent | invalid (enum) |
| p22-empty-claims | branch-activity.schema.json#/$defs/InterruptCommand | invalid (minItems) |
| p22-fractional-claim | branch-activity.schema.json#/$defs/InterruptCommand | invalid (type) |
| p22-arbitrary-branch | branch-activity.schema.json#/$defs/InterruptCommand | invalid (additionalProperties) |
| p22-fractional-redispatch | b2b-intake.schema.json#/$defs/RedispatchCommand | invalid (type) |
| p23-deny-price-edit | corrections.schema.json#/$defs/CorrectCommand | invalid (additionalProperties) |
| p23-deny-fraction | corrections.schema.json#/$defs/CorrectCommand | invalid (type) |
| p23-deny-revision | corrections.schema.json#/$defs/CorrectCommand | invalid (required) |
| p23-event-reject-0 | corrections.schema.json#/$defs/Event | invalid (minimum) |
| p23-event-reject-1 | corrections.schema.json#/$defs/Event | invalid (minimum) |
| p23-event-reject-2 | corrections.schema.json#/$defs/AdoptionEvent | invalid (required) |
| monitoring-hidden-count | monitoring.schema.json#/$defs/Snapshot | invalid (additionalProperties) |
| monitoring-false-presence | monitoring.schema.json#/$defs/Snapshot | invalid (additionalProperties) |
| monitoring-false-applied | monitoring.schema.json#/$defs/Snapshot | invalid (const) |
| monitoring-fractional-count | monitoring.schema.json#/$defs/Snapshot | invalid (type) |
| monitoring-missing-revision | monitoring.schema.json#/$defs/Snapshot | invalid (required) |
| p25-ack-is-not-applied | outbox.schema.json#/$defs/Acknowledgement | invalid (additionalProperties) |
| p25-unsupported-payload | events/sender-event.v1.schema.json | invalid (const) |
| p25-unknown-event | events/sender-event.v1.schema.json | invalid (const) |
| p26-status-without-applied-watermark | consumer.schema.json#/$defs/Status | invalid (required) |
| p26-snapshot-invents-history | consumer.schema.json#/$defs/Snapshot | invalid (const) |
| p26-invalid-report-source | consumer.schema.json#/$defs/ReportCommand | invalid (format) |
| p27-source-phantom-acceptance | source.schema.json#/$defs/Status | invalid (type) |
| p27-source-rejection-cannot-be-accepted | source.schema.json#/$defs/Status | invalid (const) |
| p30-fractional-frozen-pieces | current-activity.schema.json#/$defs/DeliveryAffordance | invalid (type) |
| p31-malformed-pending-request | returns.schema.json#/$defs/Groups | invalid (required) |
| p31-negative-round-activity-revision | workday-closure.schema.json#/$defs/RoundSummary | invalid (minimum) |
| local-unsupported-download-format | local-work.schema.json#/$defs/Download | invalid (const) |
| p33-plan-fabricated-road-provenance | planning.schema.json#/$defs/Plan | invalid (const) |
| p34-empty-batch | sync.schema.json#/$defs/Batch | invalid (minItems) |
| p34-batch-limit | sync.schema.json#/$defs/Batch | invalid (maxItems) |
| p34-blanket-success | sync.schema.json#/$defs/BatchResult | invalid (required) |
| p34-received-without-receipt | sync.schema.json#/$defs/Entry | invalid (required) |
| p35-account-restriction-without-reauth | session.schema.json#/$defs/LoginRequest | invalid (required) |
| p35-account-restriction-not-an-auth-grant | session.schema.json#/$defs/LoginRequest | invalid (additionalProperties) |
| p35-unknown-payload-not-v1 | sync.schema.json#/$defs/Batch | invalid (const) |
| report-no-invented-actual | reporting.schema.json#/$defs/Time | invalid (type) |
| report-null-needs-reason | reporting.schema.json#/$defs/Measurement | invalid (oneOf) |
| report-money-is-exact | reporting.schema.json#/$defs/Collection | invalid (type) |
| report-no-cross-tenant-filter | reporting.schema.json#/$defs/Filters | invalid (additionalProperties) |
| diagnostics-health-invalid | diagnostics.schema.json#/$defs/Health | invalid (additionalProperties) |

[Canonical example data](../../contracts/examples/README.md)
