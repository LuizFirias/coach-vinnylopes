const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, 'extracted_docx', 'word', 'document.xml');
if (!fs.existsSync(xmlPath)) {
  console.error("document.xml not found at:", xmlPath);
  process.exit(1);
}

const xml = fs.readFileSync(xmlPath, 'utf8');

let result = [];
const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
let pMatch;
while ((pMatch = pRegex.exec(xml)) !== null) {
  const pContent = pMatch[1];
  let pText = '';
  const tokenRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\/>/g;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(pContent)) !== null) {
    if (tokenMatch[0] === '<w:br/>') {
      pText += '\n';
    } else {
      let textChunk = tokenMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      pText += textChunk;
    }
  }
  result.push(pText);
}

fs.writeFileSync(path.join(__dirname, 'VinnyLopes_UIRefactoring_v1.txt'), result.join('\n'), 'utf8');
console.log("Successfully extracted text!");
