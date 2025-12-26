import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gpuUtilizationHistory } = req.body;

    if (!gpuUtilizationHistory) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this GPU utilization data: ${JSON.stringify(gpuUtilizationHistory)}.
      Suggest one high-impact optimization for the cluster (e.g., more virtualization, changing preemption rules).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            impact: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ['suggestion', 'impact', 'difficulty']
        }
      }
    });

    const suggestions = JSON.parse(response.text.trim());
    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(200).json({ suggestion: 'Enable dynamic GPU splitting', impact: 'High', difficulty: 'Medium' });
  }
}
