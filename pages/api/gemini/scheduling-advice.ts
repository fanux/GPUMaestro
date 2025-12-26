import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { activeLoad, requestedGpus } = req.body;

    if (activeLoad === undefined || requestedGpus === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The current GPU cluster utilization is ${activeLoad}%. A user wants to request ${requestedGpus} GPUs.
      Briefly advise on whether to schedule now or wait for lower utilization, considering potential resource contention.`,
    });

    res.status(200).json({ advice: response.text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Schedule immediately (Automatic).' });
  }
}
