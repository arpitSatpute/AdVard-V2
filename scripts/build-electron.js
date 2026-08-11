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
      content = content.replace(/require\(["'](\.[^"']+)["']\)/g, (match, p1) => {
        return `require('${p1}.cjs')`;
      });
      const newPath = fullPath.slice(0, -3) + '.cjs';
      fs.writeFileSync(newPath, content);
      fs.unlinkSync(fullPath);
    }
  }
}

processDir('dist/electron');
