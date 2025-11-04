const fs = require('fs');
const path = require('path');

function generateTree(dir, prefix = '', depth = Infinity, excludeList = []) {
  if (depth < 0) return '';
  
  const dirName = path.basename(dir);
  if (excludeList.includes(dirName)) return '';
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory() && !excludeList.includes(e.name));
    const files = entries.filter(e => e.isFile() && !excludeList.includes(e.name));

    let tree = '';

    // Process folders
    folders.forEach((folder, i) => {
      const isLast = i === folders.length - 1 && files.length === 0;
      const connector = isLast ? '└── ' : '├── ';
      tree += `${prefix}${connector}${folder.name}/\n`;
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      tree += generateTree(path.join(dir, folder.name), newPrefix, depth - 1, excludeList);
    });

    // Process files
    files.forEach((file, i) => {
      const isLast = i === files.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      tree += `${prefix}${connector}${file.name}\n`;
    });

    return tree;
  } catch (error) {
    return `${prefix}└── [Error reading directory]\n`;
  }
}

// Configuration
const projectRoot = path.resolve(__dirname); // Project root directory
const excludeDirs = ['node_modules', '.expo', '.git', 'dist', 'build'];
const maxDepth = 4;

console.log('🌳 Generating project tree...');

try {
  const tree = generateTree(projectRoot, '', maxDepth, excludeDirs);
  const output = `CAZZIJOBS/\n${tree}`;
  
  fs.writeFileSync('project-tree.md', output);
  console.log('✅ Project tree saved to project-tree.md');
  console.log('\n📁 Current Structure:');
  console.log(output);
  
} catch (error) {
  console.error('❌ Error generating tree:', error.message);
}

// To run the script in node, use: 'node generateTree.js' command 