// Cloud Function/Express endpoint for meme submission
const express = require('express');
const multer = require('multer');
const { uploadToPinata } = require('./upload-to-pinata');
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /submit-meme
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('--- /submit-meme called ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    if (!req.file) {
      console.error('No image uploaded.');
      return res.status(400).json({ error: 'No image uploaded.' });
    }
    const { caption } = req.body;
    // Save file to disk temporarily
    const fs = require('fs');
    const tmpPath = `/tmp/${Date.now()}_${req.file.originalname}`;
    fs.writeFileSync(tmpPath, req.file.buffer);
    // Upload to Pinata
    const pinataRes = await uploadToPinata(tmpPath);
    fs.unlinkSync(tmpPath);
    // Store meme metadata
    const memeDoc = {
      ipfsUrl: pinataRes.ipfsUrl,
      caption,
      createdAt: new Date().toISOString(),
      points: 0,
      // Optionally: userId, username from Telegram WebApp init data
    };
    const docRef = await firestore.collection('memes').add(memeDoc);
    console.log('Meme stored:', memeDoc, 'docId:', docRef.id);
    res.json({ success: true, previewUrl: pinataRes.ipfsUrl, memeId: docRef.id });
  } catch (err) {
    console.error('Error in /submit-meme:', err);
    res.status(500).json({ error: err.message });
  }
});

// Global error handler for Multer and other errors
router.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Global error: ' + err.message });
});

module.exports = router;
