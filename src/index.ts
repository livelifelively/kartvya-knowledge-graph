import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk'; // TypeScript properly handles ESM imports

// Get equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCHEMA_DIR = path.join(__dirname, '../schemas');
const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_SCHEMA_PATH = path.join(DIST_DIR, 'schema.combined.graphql');
const SCHEMA_ORDER_PATH = path.join(SCHEMA_DIR, 'schema-order.json');

// Define types for better type safety
interface GraphQLFile {
  path: string;
  relativePath: string;
  prefix: number;
}

interface DirectoryConfig {
  name: string;
  files: (string | DirectoryConfig)[];
}

type SchemaOrderConfig = (string | DirectoryConfig)[];

interface ConfigMatch {
  found: boolean;
  indices?: number[];
}

// Function to extract numeric prefix from filename
function getNumericPrefix(filename: string): number | null {
  const match = filename.match(/^(\d+)\./);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// Recursively get all .graphql files from a directory
function getAllGraphQLFiles(dir: string, fileList: GraphQLFile[] = [], baseDir: string = dir): GraphQLFile[] {
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    console.error(chalk.red(`Error: Directory not found: ${chalk.bold(dir)}`));
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      getAllGraphQLFiles(filePath, fileList, baseDir);
    } else if (file.endsWith('.graphql')) {
      // Get the relative path from the base directory for cleaner output
      const relativePath = path.relative(baseDir, filePath);
      fileList.push({ 
        path: filePath, 
        relativePath: relativePath.replace(/\\/g, '/'), // Normalize path for consistent output on all platforms
        prefix: getNumericPrefix(file) || 0
      });
    }
  });
  
  return fileList;
}

// Load schema order from JSON file if it exists
function loadSchemaOrder(): SchemaOrderConfig | null {
  if (fs.existsSync(SCHEMA_ORDER_PATH)) {
    try {
      const orderData = JSON.parse(fs.readFileSync(SCHEMA_ORDER_PATH, 'utf8')) as SchemaOrderConfig;
      console.log(chalk.blue('Using schema-order.json for file ordering'));
      return orderData;
    } catch (error) {
      console.error(chalk.red(`Error reading schema order file: ${(error as Error).message}`));
      console.log(chalk.yellow('Falling back to numeric prefix ordering'));
    }
  }
  return null;
}

// Get file path without numeric prefix
function removeNumericPrefix(filePath: string): string {
  return filePath.replace(/\/\d+\./g, '/').replace(/^\d+\./, '');
}

// Check if a file is included in the schema order configuration
function isFileInConfig(relativePath: string, orderConfig: SchemaOrderConfig): boolean {
  if (!orderConfig || !Array.isArray(orderConfig)) return false;
  
  // Remove numeric prefixes for matching
  const cleanPath = removeNumericPrefix(relativePath);
  
  // Build an array of all file paths defined in the config
  const configPaths: string[] = [];
  
  function collectPaths(items: SchemaOrderConfig, currentPath: string = ''): void {
    items.forEach(item => {
      if (typeof item === 'string') {
        // This is a file
        configPaths.push(currentPath ? `${currentPath}/${item}` : item);
      } else if (typeof item === 'object' && item.name && Array.isArray(item.files)) {
        // This is a directory
        const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        collectPaths(item.files, newPath);
      }
    });
  }
  
  collectPaths(orderConfig);
  
  // Check if this file is in our config paths
  return configPaths.some(configPath => {
    // Match exact file paths
    if (configPath === cleanPath) {
      return true;
    }
    
    // Also match with numeric prefixes removed from both sides
    const pathParts = cleanPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    return configPath === fileName && pathParts.length === 1;
  });
}

// Match a file against the schema order configuration to get its order
function matchFileToConfig(relativePath: string, orderConfig: SchemaOrderConfig): ConfigMatch {
  if (!orderConfig || !Array.isArray(orderConfig)) return { found: false };
  
  // Remove numeric prefixes for matching
  const cleanPath = removeNumericPrefix(relativePath);
  
  // Build mapping of paths to their indices in the config
  const pathIndices = new Map<string, number[]>();
  
  function mapIndices(items: SchemaOrderConfig, currentPath: string = '', indices: number[] = []): void {
    items.forEach((item, index) => {
      const newIndices = [...indices, index];
      
      if (typeof item === 'string') {
        // This is a file
        const filePath = currentPath ? `${currentPath}/${item}` : item;
        pathIndices.set(filePath, newIndices);
        
        // Also map the filename alone (for root-level files)
        if (!currentPath) {
          pathIndices.set(item, newIndices);
        }
      } else if (typeof item === 'object' && item.name && Array.isArray(item.files)) {
        // This is a directory
        const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        mapIndices(item.files, newPath, newIndices);
      }
    });
  }
  
  mapIndices(orderConfig);
  
  // Check for exact path match first
  if (pathIndices.has(cleanPath)) {
    return { 
      found: true, 
      indices: pathIndices.get(cleanPath) 
    };
  }
  
  // For root level files, try matching just the filename
  const pathParts = cleanPath.split('/');
  if (pathParts.length === 1 && pathIndices.has(pathParts[0])) {
    return {
      found: true,
      indices: pathIndices.get(pathParts[0])
    };
  }
  
  return { found: false };
}

// Calculate priority based on indices in the schema order
function calculatePriority(indices: number[] | undefined): number {
  if (!indices || indices.length === 0) return Number.MAX_SAFE_INTEGER;
  
  // Convert indices array to a sort key
  // Each level gets progressively less weight
  return indices.reduce((priority, index, level) => {
    return priority + (index * Math.pow(10000, 10 - level));
  }, 0);
}

function sortBySchemaPriority(a: GraphQLFile, b: GraphQLFile, orderConfig: SchemaOrderConfig | null): number {
  // If we have an order config, use it for sorting
  if (orderConfig) {
    const aMatch = matchFileToConfig(a.relativePath, orderConfig);
    const bMatch = matchFileToConfig(b.relativePath, orderConfig);
    
    // If both files are found in the config, sort by their position
    if (aMatch.found && bMatch.found) {
      const aPriority = calculatePriority(aMatch.indices);
      const bPriority = calculatePriority(bMatch.indices);
      return aPriority - bPriority;
    }
    
    // If only one file is in the config, prioritize it
    if (aMatch.found) return -1;
    if (bMatch.found) return 1;
  }
  
  // Fall back to the original sorting logic for files not in the config
  // Split paths into segments
  const aSegments = a.relativePath.split('/');
  const bSegments = b.relativePath.split('/');
  
  // Compare each directory level separately
  const maxLength = Math.max(aSegments.length, bSegments.length);
  
  for (let i = 0; i < maxLength - 1; i++) {
    // If one path is shorter than the other and we've reached its end
    if (i >= aSegments.length) return -1;
    if (i >= bSegments.length) return 1;
    
    // Compare directory prefixes as numbers
    const aDirPrefix = getNumericPrefix(aSegments[i]) || 0;
    const bDirPrefix = getNumericPrefix(bSegments[i]) || 0;
    
    if (aDirPrefix !== bDirPrefix) {
      return aDirPrefix - bDirPrefix;
    }
  }
  
  // If all directories are the same, compare file prefixes
  // Get the prefix from the last segment
  const aFilePrefix = a.prefix || 0;
  const bFilePrefix = b.prefix || 0;
  
  return aFilePrefix - bFilePrefix;
}

function generateCombinedSchema(): void {
  console.log(chalk.cyan('🔄 Generating combined schema...'));
  
  // Check if schemas directory exists
  if (!fs.existsSync(SCHEMA_DIR)) {
    console.error(chalk.red(`❌ Error: Schemas directory not found: ${chalk.bold(SCHEMA_DIR)}`));
    return;
  }

  // Load schema order configuration if available
  const orderConfig = loadSchemaOrder();

  // Recursively get all .graphql files from the schemas directory
  let graphqlFiles = getAllGraphQLFiles(SCHEMA_DIR);
  
  if (graphqlFiles.length === 0) {
    console.error(chalk.red('❌ Error: No GraphQL files found in schemas directory'));
    return;
  }
  
  // Filter files to only include those in the config (if config exists)
  if (orderConfig) {
    const before = graphqlFiles.length;
    graphqlFiles = graphqlFiles.filter(file => isFileInConfig(file.relativePath, orderConfig));
    console.log(chalk.yellow(`📋 Filtered from ${chalk.bold(before)} to ${chalk.bold(graphqlFiles.length)} files based on schema-order.json`));
    
    // Log files that were excluded for debugging
    if (before > graphqlFiles.length) {
      console.log(chalk.yellow('🔍 Excluded files:'));
      getAllGraphQLFiles(SCHEMA_DIR).filter(file => !isFileInConfig(file.relativePath, orderConfig))
        .forEach(file => console.log(chalk.gray(`  - ${file.relativePath}`)));
    }
  }
  
  // Sort files based on order config
  graphqlFiles.sort((a, b) => sortBySchemaPriority(a, b, orderConfig));
  
  // Combine all GraphQL files
  let combinedSchema = '# COMBINED SCHEMA\n# Auto-generated from schema files\n\n';
  
  for (const file of graphqlFiles) {
    console.log(chalk.blue(`📄 Processing schema: ${chalk.bold(file.relativePath)}`));
    
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      combinedSchema += `\n# ----- ${file.relativePath} ----- \n${content}\n# ----- END ${file.relativePath} ----- \n`;
    } catch (error) {
      console.error(chalk.red(`❌ Error reading schema file ${file.relativePath}: ${(error as Error).message}`));
    }
  }
  
  // Handle special case of schema.graphql at the root level
  const rootSchemaPath = path.join(SCHEMA_DIR, 'schema.graphql');
  if (fs.existsSync(rootSchemaPath)) {
    console.log(chalk.blue('📄 Processing root schema.graphql'));
    try {
      const rootSchema = fs.readFileSync(rootSchemaPath, 'utf8');
      // Add root schema at the end
      combinedSchema += `\n# ---------- \n${rootSchema}\n# ---------- \n`;
    } catch (error) {
      console.error(chalk.red(`❌ Error reading root schema file: ${(error as Error).message}`));
    }
  }
  
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.log(chalk.blue(`📁 Creating dist directory: ${chalk.bold(DIST_DIR)}`));
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Write combined schema to file
  try {
    fs.writeFileSync(OUTPUT_SCHEMA_PATH, combinedSchema);
    console.log(chalk.green(`✅ Combined schema successfully written to: ${chalk.bold(OUTPUT_SCHEMA_PATH)}`));
  } catch (error) {
    console.error(chalk.red(`❌ Error writing combined schema file: ${(error as Error).message}`));
  }
}

// Execute the schema generation
generateCombinedSchema();

console.log(chalk.green.bold('\n🎉 Schema modularization complete! 🎉\n'));