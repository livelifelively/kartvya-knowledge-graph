const fs = require('fs');
const path = require('path');

// Configuration
const SCHEMA_DIR = path.join(__dirname, '../schemas');
const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_SCHEMA_PATH = path.join(DIST_DIR, 'schema.combined.graphql');

// Function to extract numeric prefix from filename
function getNumericPrefix(filename) {
  const match = filename.match(/^(\d+)\./);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// Recursively get all .graphql files from a directory
function getAllGraphQLFiles(dir, fileList = [], baseDir = dir) {
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    console.error(`Error: Directory not found: ${dir}`);
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Check if directory has numeric prefix
      const dirPrefix = getNumericPrefix(file);
      if (dirPrefix === null) {
        console.error(`Error: Directory doesn't have a numeric prefix: ${filePath}`);
        process.exit(1); // Exit with error
      }
      
      // Recursively process subdirectories
      getAllGraphQLFiles(filePath, fileList, baseDir);
    } else if (file.endsWith('.graphql')) {
      // Check if file has numeric prefix
      const filePrefix = getNumericPrefix(file);
      if (filePrefix === null) {
        console.error(`Error: GraphQL file doesn't have a numeric prefix: ${filePath}`);
        process.exit(1); // Exit with error
      }
      
      // Get the relative path from the base directory for cleaner output
      const relativePath = path.relative(baseDir, filePath);
      fileList.push({ 
        path: filePath, 
        relativePath: relativePath.replace(/\\/g, '/'), // Normalize path for consistent output on all platforms
        prefix: filePrefix
      });
    }
  });
  
  return fileList;
}

function sortBySchemaPriority(a, b) {
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

function generateCombinedSchema() {
  console.log('Generating combined schema...');
  
  // Check if schemas directory exists
  if (!fs.existsSync(SCHEMA_DIR)) {
    console.error(`Error: Schemas directory not found: ${SCHEMA_DIR}`);
    return;
  }

  // Recursively get all .graphql files from the schemas directory
  const graphqlFiles = getAllGraphQLFiles(SCHEMA_DIR);
  
  if (graphqlFiles.length === 0) {
    console.error('Error: No GraphQL files found in schemas directory');
    return;
  }
  
  // Sort files based on numeric prefixes in directory and file names
  graphqlFiles.sort(sortBySchemaPriority);
  
  // Combine all GraphQL files
  let combinedSchema = '# COMBINED SCHEMA\n# Auto-generated from schema files\n\n';
  
  for (const file of graphqlFiles) {
    console.log(`Processing schema: ${file.relativePath}`);
    
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      combinedSchema += `\n# ----- ${file.relativePath} ----- \n${content}\n# ----- END ${file.relativePath} ----- \n`;
    } catch (error) {
      console.error(`Error reading schema file ${file.relativePath}: ${error.message}`);
    }
  }
  
  // Handle special case of schema.graphql at the root level
  const rootSchemaPath = path.join(SCHEMA_DIR, 'schema.graphql');
  if (fs.existsSync(rootSchemaPath)) {
    console.log('Processing root schema.graphql');
    try {
      const rootSchema = fs.readFileSync(rootSchemaPath, 'utf8');
      // Add root schema at the end
      combinedSchema += `\n# ---------- \n${rootSchema}\n# ---------- \n`;
    } catch (error) {
      console.error(`Error reading root schema file: ${error.message}`);
    }
  }
  
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.log(`Creating dist directory: ${DIST_DIR}`);
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  
  // Write combined schema to output file
  fs.writeFileSync(OUTPUT_SCHEMA_PATH, combinedSchema);
  
  console.log(`Combined schema generated at: ${OUTPUT_SCHEMA_PATH}`);
  console.log(`Included ${graphqlFiles.length} schema files`);
}

// Run the schema generation
generateCombinedSchema(); 