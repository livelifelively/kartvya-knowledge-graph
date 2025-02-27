// Type definitions for schema modularizer

export interface DirectoryConfig {
  name: string;
  files: (string | DirectoryConfig)[];
}

export type SchemaOrderConfig = (string | DirectoryConfig)[]; 