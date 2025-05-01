// vertexai.js - Utility for Vertex AI text and meme generation
const { VertexAI } = require('@google-cloud/vertexai');

const project = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
const location = process.env.VERTEXAI_LOCATION || 'us-central1';
const model = process.env.VERTEXAI_MODEL || 'gemini-1.0-pro';

// Initialize Vertex AI client
const vertexAI = new VertexAI({ project, location });

/**
 * Generate a witty or viral reply using Vertex AI
 * @param {string} prompt - The prompt to send to Gemini/Vertex
 * @returns {Promise<string>} - The generated reply
 */
async function generateReply(prompt) {
  try {
    const req = {
      endpoint: `projects/${project}/locations/${location}/publishers/google/models/${model}`,
      instances: [{ prompt }],
      parameters: { maxOutputTokens: 128, temperature: 0.8 }
    };
    const [response] = await vertexAI.predict(req);
    const text = response?.predictions?.[0]?.content || 'Sorry, no reply.';
    return text;
  } catch (err) {
    console.error('[VertexAI] Error generating reply:', err);
    return 'Sorry, I could not generate a reply.';
  }
}

/**
 * Generate a meme idea or caption using Vertex AI
 * @param {string} topic - The meme topic or context
 * @returns {Promise<string>} - The meme caption or idea
 */
async function generateMeme(topic) {
  return generateReply(`Write a viral meme caption about: ${topic}`);
}

module.exports = { generateReply, generateMeme };
