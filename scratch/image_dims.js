const fs = require('fs');
const path = require('path');

function getJpegDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    let i = 2;
    while (i < buffer.length) {
      if (buffer[i] !== 0xff) return null; // Invalid JPEG
      const marker = buffer[i + 1];
      if (marker === 0xc0 || marker === 0xc2) { // SOF0 or SOF2
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
      const length = buffer.readUInt16BE(i + 2);
      i += 2 + length;
    }
  } catch (err) {
    return null;
  }
  return null;
}

const dir = 'public/images/assets';
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
    const filePath = path.join(dir, file);
    const dims = getJpegDimensions(filePath);
    if (dims) {
      console.log(`${file}: ${dims.width}x${dims.height} (ratio: ${(dims.width/dims.height).toFixed(2)})`);
    } else {
      console.log(`${file}: Couldn't parse JPEG headers`);
    }
  }
}
