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
  
  // Country-specific schemas
  "country.graphql",
  
  // Domain specific schemas
  "public-policy-domains.graphql"
]; 