const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{' || char === '(' || char === '[') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === '}' || char === ')' || char === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched closing ${char} at line ${i + 1}, col ${j + 1}`);
        continue;
      }
      const top = stack.pop();
      if (
        (char === '}' && top.char !== '{') ||
        (char === ')' && top.char !== '(') ||
        (char === ']' && top.char !== '[')
      ) {
        console.log(`Mismatch: opened ${top.char} at line ${top.line}, col ${top.col} but closed with ${char} at line ${i + 1}, col ${j + 1}`);
      }
    }
  }
}

if (stack.length > 0) {
  console.log(`Remaining unclosed braces:`);
  stack.forEach(item => {
    console.log(`Unclosed ${item.char} at line ${item.line}, col ${item.col}`);
  });
} else {
  console.log("All braces matched!");
}
