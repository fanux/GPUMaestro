
import { GoogleGenAI, Type } from "@google/genai";

// Always use direct process.env.API_KEY for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getJobStatusInsights = async (logs: string[], jobName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following execution logs for the GPU job "${jobName}" and provide a concise summary of the progress and any potential issues:
      
      Logs:
      ${logs.join('\n')}
      
      Summary should be 2-3 sentences max.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate insights at this time.";
  }
};

export const getSchedulingAdvice = async (activeLoad: number, requestedGpus: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The current GPU cluster utilization is ${activeLoad}%. A user wants to request ${requestedGpus} GPUs. 
      Briefly advise on whether to schedule now or wait for lower utilization, considering potential resource contention.`,
    });
    return response.text;
  } catch (error) {
    return "Schedule immediately (Automatic).";
  }
};

export const getOptimizationSuggestions = async (gpuUtilizationHistory: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this GPU utilization data: ${JSON.stringify(gpuUtilizationHistory)}. 
      Suggest one high-impact optimization for the cluster (e.g., more virtualization, changing preemption rules).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            impact: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ["suggestion", "impact", "difficulty"]
        }
      }
    });
    // Use .text property directly and trim for JSON parsing
    return JSON.parse(response.text.trim());
  } catch (error) {
    return { suggestion: "Enable dynamic GPU splitting", impact: "High", difficulty: "Medium" };
  }
};
