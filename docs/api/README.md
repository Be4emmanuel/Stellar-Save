# Backend API Reference

External reference for the backend REST and GraphQL APIs. This document is the
published entry point for API consumers; the generated schema artifacts live
next to it in this directory.

- `openapi.yaml` — OpenAPI 3.0 description of the REST endpoints.
- `schema.graphql` — GraphQL SDL for the query/mutation surface.

Both artifacts are derived from the existing backend route and schema
definitions, so they must be regenerated whenever those definitions change.

## REST (OpenAPI)

Base URL: `/api`

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/health` | Liveness/readiness probe. |
| `GET` | `/api/contracts` | List contracts. |
| `GET` | `/api/contracts/{id}` | Fetch a single contract by id. |
| `POST` | `/api/contracts` | Create a contract. |
| `GET` | `/api/services` | List backend services. |
| `GET` | `/api/services/{id}` | Fetch a single service by id. |
| `GET` | `/api/guides` | List documentation guides. |
| `GET` | `/api/guides/{slug}` | Fetch a guide by slug. |

Spot-check these against the route definitions in the backend before publishing
an update; the table above is the human-readable summary of `openapi.yaml`.

## GraphQL

The GraphQL schema is defined in `frontend/src/graphql` and mirrored in
`schema.graphql`. Consumers should introspect the running endpoint for the
authoritative schema; the committed SDL is a snapshot for reference and
tooling.

## Versioning and deprecation policy

- The API is versioned in the URL path (`/api/v1/...`). Breaking changes ship
  under a new major version; the previous major version remains available for
  at least one release cycle.
- Additive changes (new fields, new optional parameters, new endpoints) are
  considered non-breaking and may land in the current version.
- Deprecations are announced in this document and in the changelog before
  removal. Deprecated fields/endpoints are marked `deprecated: true` in
  `openapi.yaml` / `schema.graphql` and kept for at least one release cycle
  after the announcement.
- Removal of a deprecated surface is a breaking change and follows the major
  version bump rule above.

## Regenerating

Regenerate `openapi.yaml` and `schema.graphql` from the backend route and
schema definitions whenever those definitions change, then update the tables
above if the endpoint surface changed.
