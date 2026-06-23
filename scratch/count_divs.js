const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'page.tsx');
try {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find start and end line of the pagesSettingsTab === "About Us" block
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('pagesSettingsTab === "About Us"')) {
      startIdx = i;
    }
    if (startIdx !== -1 && lines[i].includes('pagesSettingsTab === "Services"')) {
      endIdx = i;
      break;
    }
  }
  
  console.log(`Analyzing lines ${startIdx + 1} to ${endIdx + 1}...`);
  
  let openDivs = 0;
  let closeDivs = 0;
  
  const blockLines = lines.slice(startIdx, endIdx);
  blockLines.forEach((line, idx) => {
    // Basic regex count
    const opens = (line.match(/<div(\s|>|$)/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    
    openDivs += opens;
    closeDivs += closes;
    
    if (opens > 0 || closes > 0) {
      console.log(`Line ${startIdx + idx + 1}: opens=${opens}, closes=${closes}, net=${openDivs - closeDivs} | ${line.trim().substring(0, 100)}`);
    }
  });
  
  console.log(`Total Open divs: ${openDivs}`);
  console.log(`Total Close divs: ${closeDivs}`);
  console.log(`Net imbalance: ${openDivs - closeDivs}`);
} catch (err) {
  console.error(err);
}
