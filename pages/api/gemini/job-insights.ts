import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { logs, jobName } = req.body;

    if (!logs || !jobName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following execution logs for the GPU job "${jobName}" and provide a concise summary of the progress and any potential issues:

      Logs:
      ${logs.join('\n')}

      Summary should be 2-3 sentences max.`,
    });

    res.status(200).json({ insight: response.text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Unable to generate insights at this time.' });
  }
}
