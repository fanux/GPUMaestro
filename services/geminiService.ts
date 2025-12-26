export const getJobStatusInsights = async (logs: string[], jobName: string) => {
  try {
    const response = await fetch('/api/gemini/job-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs, jobName }),
    });

    if (!response.ok) {
      throw new Error('Failed to get job insights');
    }

    const data = await response.json();
    return data.insight;
  } catch (error) {
    console.error('Error fetching job insights:', error);
    return 'Unable to generate insights at this time.';
  }
};

export const getSchedulingAdvice = async (activeLoad: number, requestedGpus: number) => {
  try {
    const response = await fetch('/api/gemini/scheduling-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activeLoad, requestedGpus }),
    });

    if (!response.ok) {
      throw new Error('Failed to get scheduling advice');
    }

    const data = await response.json();
    return data.advice;
  } catch (error) {
    console.error('Error fetching scheduling advice:', error);
    return 'Schedule immediately (Automatic).';
  }
};

export const getOptimizationSuggestions = async (gpuUtilizationHistory: any[]) => {
  try {
    const response = await fetch('/api/gemini/optimization-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gpuUtilizationHistory }),
    });

    if (!response.ok) {
      throw new Error('Failed to get optimization suggestions');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching optimization suggestions:', error);
    return { suggestion: 'Enable dynamic GPU splitting', impact: 'High', difficulty: 'Medium' };
  }
};
