# Template Designer — Resolver Rules

The Template Designer never reads branding or communication values directly
from the database. Every visible value flows through the
`CommunicationResolver` chain:

```
Organization → Module → Department → Location → Asset Library → Text Block
                                                              ↘ Template override
```

## General tab (enterprise definition)

The General tab captures the full enterprise definition of a template:

| Group | Fields |
| --- | --- |
| Identity | Code, Name, Category, Subcategory, Description, Status, Version, Effective dates |
| Ownership & Scope | Owner Department, Business Object, Recipient Type, Security Classification |
| Profiles & Policies | Communication Profile, Document Profile, Signature Policy, Stamp Policy, Approval Workflow, Retention Policy, DMS Folder |
| Localization & Delivery | Default Language, Supported Languages, Output Channels |

All values are persisted on `comm_letterhead` (new columns added in migration
`20260627-122458`). They are read by the enterprise resolvers to drive
runtime behavior — modules never touch these columns directly.

## Source Inspector

The right pane of the designer shows the live A4 preview **and** a
`SourceInspector` panel. Every value rendered in the preview is listed with
its origin: Organization / Department / Location / Asset Library / Text
Block / Template Override / System Default / Missing.

Missing values surface a red banner so the administrator can fix them
before saving.

## Health checks

`runHealthChecks()` flags any active template missing one of:
Owner Department, Communication Profile, Document Profile, or Output
Channels — surfacing in `EnterpriseHealthPage`.
