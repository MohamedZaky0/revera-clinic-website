const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data', 'page_settings.json');
try {
  const content = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(content);
  console.log("Keys in page_settings.json:", Object.keys(data));
  if (data.hero) console.log("Hero keys:", Object.keys(data.hero));
  if (data.about) console.log("About keys:", Object.keys(data.about));
  if (data.results) console.log("Results keys:", Object.keys(data.results));
  if (data.aboutPage) {
    console.log("aboutPage keys:", Object.keys(data.aboutPage));
    console.log("whatWeDoList (EN):", data.aboutPage.whatWeDoList);
    console.log("whatWeDoListAr (AR):", data.aboutPage.whatWeDoListAr);
    console.log("whatWeDoImage1:", data.aboutPage.whatWeDoImage1 ? data.aboutPage.whatWeDoImage1.substring(0, 50) + "..." : "undefined");
    console.log("whatWeDoImage2:", data.aboutPage.whatWeDoImage2 ? data.aboutPage.whatWeDoImage2.substring(0, 50) + "..." : "undefined");
  } else {
    console.log("aboutPage key is NOT present in the JSON file.");
  }
} catch (err) {
  console.error("Error reading JSON file:", err);
}
