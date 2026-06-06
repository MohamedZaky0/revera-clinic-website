const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  { regex: /#5a3d34/gi, replacement: '#414E36' },
  { regex: /#c4b29f/gi, replacement: '#C4AE7C' },
  { regex: /#fcf4f1/gi, replacement: '#EDF1EC' },
  { regex: /#3d2820/gi, replacement: '#2e3a26' },
  { regex: /#8a6d62/gi, replacement: '#5A6A51' },
  { regex: /#fcf6f3/gi, replacement: '#EDF1EC' },
  { regex: /#f5e8e3/gi, replacement: '#F2EFE9' },
  { regex: /#b8a48e/gi, replacement: '#B59E6A' }, // Darker gold hover
  { regex: /#481e0b/gi, replacement: '#1F251A' }, // Old dark brown -> deepest olive-black
  { regex: /#FDF8F5/gi, replacement: '#EDF1EC' }, // Old alternate secondary -> sage tint canvas
  { regex: /#fce2d7/gi, replacement: '#EDF1EC' }, // Old peach accent -> sage tint canvas
  { regex: /#b8a591/gi, replacement: '#B59E6A' }, // Old hover -> darker gold hover
  { regex: /#483028/gi, replacement: '#1F251A' }, // Old dark brown -> deepest olive-black
  { regex: /#33160c/gi, replacement: '#1F251A' }, // Old deepest brown -> deepest olive-black
  { regex: /#f9f3ee/gi, replacement: '#EDF1EC' }, // Old background -> sage tint canvas
  { regex: /rgba\(196,178,159/gi, replacement: 'rgba(196,174,124' },
  { regex: /rgba\(196,\s*178,\s*159/gi, replacement: 'rgba(196, 174, 124' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && /\.(tsx|ts|js|css)$/.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const rep of replacements) {
        if (rep.regex.test(content)) {
          content = content.replace(rep.regex, rep.replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated colors in: ${fullPath}`);
      }
    }
  }
}

console.log('Starting color replacement script...');
processDirectory(srcDir);
console.log('Color replacement complete!');
