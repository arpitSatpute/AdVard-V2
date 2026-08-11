import fs from 'fs';
import path from 'path';

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/import\s+([\s\S]*?)\s+from\s+['"](\.[^'"]+)['"]/g, (match, p1, p2) => {
        return `import ${p1} from '${p2}.mjs'`;
      });
      const newPath = fullPath.slice(0, -3) + '.mjs';
      fs.writeFileSync(newPath, content);
      fs.unlinkSync(fullPath);
    }
  }
}

processDir('dist/electron');
