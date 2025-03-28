// Schema ordering configuration for GraphQL files
// This defines the order in which schema files will be combined

import { type SchemaOrderConfig } from './types.js'; // Use .js extension for ESM

// Define the schema order
export const schemaOrder: SchemaOrderConfig = [
  // Meta data schemas should come first
  "meta-data.graphql", 
  
  // Authentication and citizen schemas
  {
    name: "auth",
    files: [
      "auth.graphql", 
      "citizen.graphql" // User identity and authentication
    ]
  },
  
  // Basic building block schemas
  "language.graphql",
  "name.graphql",
  "person.graphql",
  {
    name: "person",
    files: [
      "person.graphql",
      "indian-politician.graphql"
    ]
  },
  
  // Data source related schemas
  "sources.graphql",
  
  // Location and geography schemas
  "geo.graphql",
  
  // Time-related schemas
  "date-time.graphql",

  "metrics.graphql",
  
  // Country-specific schemas
  "country.graphql",

  "government-system-types.graphql",
  
  // Domain specific schemas
  "public-policy-domains.graphql",

  "legal-document.graphql",

  {
    name: "india",
    files: [
      {
        name: "union-government",
        files: [
          "indian-government.graphql",
        ]
      },
      "parliament.graphql",
      {
        name: "elections",
        files: [
          "elections.graphql",
          "political-parties.graphql",
        ]
      },
      {
        name: "ministeries-departments",
        files: [
          "ministeries.graphql",
          "health.graphql",
          "policy-domains-objectives.graphql"
        ]
      },
      {
        name: "citizens",
        files: [
          "citizen-attributes.graphql",
          "citizen-groups-attributes.graphql"
        ]
      },
      {
        name: "services",
        files: [
          "services.graphql",
          "programmes.graphql"
        ]
      },
      {
        name: "policy",
        files: [
          "government-policy-documents.graphql"
        ]
      },
      {
        name: "regions",
        files: [
          "meta-data.graphql",
          "state-union-territory.graphql",
          "district.graphql",
          "loksabha-constituency.graphql",
          "vidhansabha-constituency.graphql",
          "sub-district.graphql",
        ]
      },
      {
        name: "events",
        files: [
          "events.administrative-regions.graphql",
          "events.programs.graphql"
        ]
      }
    ]
  }
]; 