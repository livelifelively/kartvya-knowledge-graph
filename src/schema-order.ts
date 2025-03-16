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
      "indian-government.graphql",
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
          "health.graphql"
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
      }
    ]
  }
]; 