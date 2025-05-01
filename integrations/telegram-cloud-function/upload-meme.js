const { uploadToPinata } = require('./upload-to-pinata');
const path = require('path');

// Automatically find a meme file (gif/png/jpg) in the current directory
const fs = require('fs');
const exts = ['.gif', '.png', '.jpg', '.jpeg'];
const files = fs.readdirSync(__dirname).filter(f => exts.includes(path.extname(f).toLowerCase()));

if (!files.length) {
  console.error('No meme image (gif/png/jpg) found in the directory. Please add your meme file.');
  process.exit(1);
}

const memePath = path.resolve(__dirname, files[0]);
console.log('Uploading meme:', memePath);

uploadToPinata(memePath)
  .then(res => {
    console.log('Upload successful:', res);
  })
  .catch(err => {
    console.error('Upload failed:', err);
  });
