const fs = require('fs');

function getFileContents(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeToFile(filePath, newContents) {
  fs.writeFileSync(filePath, newContents);
}

module.exports = {
  getFileContents,
  writeToFile,
};
