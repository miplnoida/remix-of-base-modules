# PostgreSQL → SQL Server / .NET Type Mapping

Applies to every new gap-module entity and every command payload.

| Concern                | PostgreSQL                | SQL Server                    | .NET / C#                | JSON on the wire      |
| ---------------------- | ------------------------- | ----------------------------- | ------------------------ | --------------------- |
| Identifier             | `uuid`                    | `uniqueidentifier`            | `Guid`                   | UUID string           |
| Timestamp (UTC)        | `timestamptz`             | `datetimeoffset(3)`           | `DateTimeOffset`         | ISO-8601 with `Z`     |
| Monetary               | `numeric(18,2)`           | `decimal(18,2)`               | `decimal`                | string                |
| Percentages / ratios   | `numeric(9,6)`            | `decimal(9,6)`                | `decimal`                | string                |
| Row version            | `bigint` counter          | `rowversion`                  | `byte[]` / `string`      | opaque string         |
| Enumerated status      | `text` with CHECK         | `varchar(64)` + CHECK         | typed C# enum            | short string          |
| Structured extension   | `jsonb` (only when needed)| `nvarchar(max) json`          | `JsonDocument` / DTO     | JSON object           |
| Booleans               | `boolean`                 | `bit`                         | `bool`                   | boolean               |
| Foreign keys           | `uuid REFERENCES ...`     | `uniqueidentifier FK`         | `Guid`                   | UUID string           |
| Audit — user code      | `text` NOT NULL           | `varchar(64)` NOT NULL        | `string`                 | string                |
| Audit — entered_at     | `timestamptz DEFAULT now()`| `datetimeoffset(3) DEFAULT SYSUTCDATETIME()` | `DateTimeOffset` | ISO-8601 UTC       |

## Rules

1. Money **never** goes through JavaScript floating-point for final
   calculations. Compute server-side in `decimal`. Wire as string.
2. Avoid PostgreSQL-only operators (`@>`, `->>`, arrays as first-class,
   `tsvector`) in canonical business logic. Confine those to reporting
   surfaces.
3. State enums are stable string codes at the API. Never leak internal
   PG check-constraint names to clients.
4. Row version is portable: `bigint` in PG, `rowversion` in SQL Server —
   both surface as strings in the envelope.
