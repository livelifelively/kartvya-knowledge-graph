# Schema Style Guide

## Type Naming

- Use underscore prefix for domain types: `_Indian_District_`
- Use suffix to indicate type purpose:
  - `_Version_`: A specific version of an entity
  - `_Region_`: A geographic/administrative region
  - `_Reorganisation_`: An event that changes regions

## Field Naming

- Use camelCase for fields
- Use consistent naming for similar concepts across types
- Always include audit fields: `node_created_on`, `node_updates`

## Relationships

- Always define bidirectional relationships with `@hasInverse`
- Document the cardinality in comments (one-to-many, many-to-many) 