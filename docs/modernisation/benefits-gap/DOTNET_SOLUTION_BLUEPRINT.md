# BN Gap Modules — .NET Solution Blueprint

**Status:** Design blueprint for future migration. Not a current implementation task.
**Contract version:** matches `BN_GAP_CONTRACT_VERSION` in `src/services/bn/gap/gapDiagnosticsService.ts`.

## 1. Guiding principle

The React UI and the six gap modules already sit behind a **portable command envelope** and a **`BenefitsGapApiClient` interface** (see `src/services/bn/gap/benefitsGapApiClient.ts`).
Migrating to ASP.NET Core is therefore an **adapter swap**, not a rewrite: replace `SupabaseBenefitsGapAdapter` with `DotNetBenefitsGapAdapter`, keep everything else.

## 2. Proposed solution structure

```
Misha.Benefits.sln
├── src/
│   ├── Misha.Benefits.Api/               # ASP.NET Core Web API host
│   ├── Misha.Benefits.Application/        # Command/query handlers, DTOs, validators
│   ├── Misha.Benefits.Domain/             # Entities, value objects, state machines
│   ├── Misha.Benefits.Infrastructure/     # EF Core, SQL Server, outbox, idempotency store
│   ├── Misha.Benefits.Contracts/          # DTOs + OpenAPI schemas (published NuGet)
│   └── Misha.Benefits.Migration/          # PG→SQL Server + data migration tooling
└── tests/
    ├── Misha.Benefits.UnitTests/
    ├── Misha.Benefits.IntegrationTests/   # Executes the SAME contract fixtures
    └── Misha.Benefits.ContractTests/      # Replays TypeScript contract fixtures
```

## 3. Layer responsibilities

| Layer          | Owns                                                                 | Depends on              |
| -------------- | -------------------------------------------------------------------- | ----------------------- |
| Api            | Controllers, auth, permission middleware, OpenAPI, hosting           | Application, Contracts  |
| Application    | `ICommandHandler<TCommand,TResult>`, validators, orchestrations      | Domain                  |
| Domain         | Aggregates: `Appeal`, `Overpayment`, `MeansTest`, `RiskCase`, `UpratingRun`, `MortalityEvent`; state-machine invariants | none |
| Infrastructure | EF Core DbContext, migrations, outbox, `IIdempotencyStore`, `IAuditWriter`, `ITransactionRunner`, integrations | Application interfaces |
| Contracts      | Envelope, result, DTOs, error codes, capability enums                | none                    |

## 4. Command pipeline port

The TypeScript pipeline (`gapCommandPipeline.ts`) is mirrored 1:1 in `Application/Pipelines/GapCommandPipeline.cs`. Same 14-step ordering, same short-circuit rules, same fail-closed defaults. Because both the TS and C# versions depend only on injected stores, the pipeline logic itself is trivially portable.

Dependency injection registrations (Program.cs):

```csharp
builder.Services
  .AddScoped<IModuleRegistrationStore, EfModuleRegistrationStore>()
  .AddScoped<IRoleCapabilityChecker, DbRoleCapabilityChecker>()
  .AddScoped<IIdempotencyStore, SqlServerIdempotencyStore>()
  .AddScoped<IVersionStore, EfVersionStore>()
  .AddScoped<IAuditWriter, OutboxAuditWriter>()
  .AddScoped<ITransactionRunner, EfTransactionRunner>()
  .AddScoped<IHandlerRegistry, ReflectionHandlerRegistry>()
  .AddScoped<GapCommandPipeline>();
```

## 5. Endpoint contract

Single POST endpoint per module (or one shared endpoint), body = envelope:

```
POST /api/v1/bn/{module}/commands
Authorization: Bearer <JWT>
Content-Type: application/json
Idempotency-Key: <uuid>          # also carried inside envelope
```

Response shape identical to `BnGapCommandResult<T>`.

## 6. AuthN / AuthZ

- **AuthN:** JWT bearer (same IDP as current). Middleware maps `sub` → `actorUserId`.
- **AuthZ:** `[RequireCapability("bn_appeals:decide")]` attribute over controllers, plus the pipeline's own capability check (defence in depth).
- **PII masking:** filter attribute at controller-boundary produces masked DTOs when `mask=true` header supplied by admin surfaces.
- **Rate limiting:** ASP.NET rate-limiter partitioned by `actorUserId + moduleCode`.

## 7. Persistence (Entity Framework Core)

- `DbContext` per bounded context (Appeals, Overpayments, MeansTests, Risk, Uprating, Mortality) sharing one physical database.
- `rowversion` columns → `[Timestamp] public byte[] RowVersion { get; set; }`.
- `IEntityTypeConfiguration<T>` per aggregate; explicit `Property(x => x.Money).HasPrecision(18,2)`.
- Transactions via `IDbContextTransaction`, driven by `EfTransactionRunner`.
- Outbox table (`bn_outbox`) + hosted worker → dispatches integration events (Communication Hub, Legal, Finance).

## 8. Background workers

| Worker                          | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `IdempotencyGcWorker`           | Purge idempotency rows older than N days                       |
| `OutboxDispatcherWorker`        | Ship integration events to Comm Hub / Legal / Finance / DMS   |
| `UpratingExecutorWorker`        | Chunked award adjustment during a run                          |
| `MortalityReconciliationWorker` | Cross-check IP module authoritative death feed                 |
| `RiskSignalIntakeWorker`        | Consume detection-rule outputs                                 |

## 9. Observability

- OpenTelemetry traces per command (correlationId → traceId).
- Metrics: `command.executed`, `command.failed`, `command.replayed`, `command.rejected`, `pipeline.duration.p95`.
- Structured logs (Serilog) with the same event names emitted by the TypeScript pipeline.

## 10. Migration cadence

See `MIGRATION_SEQUENCE.md`. Summary: adapter goes live behind a feature flag per module; React never notices the swap because it depends on `BenefitsGapApiClient`.
