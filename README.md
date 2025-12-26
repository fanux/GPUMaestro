# GPU Maestro - Management Platform

GPU Maestro is a high-performance, intelligent GPU workload management engine designed for modern AI/ML teams. It provides a commercial-grade interface for managing Kubernetes clusters, interactive sandboxes, batch training jobs, and model artifacts.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

## 🛠 Tech Stack

- **Framework**: Next.js 16 + React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Intelligence**: Google Gemini API (@google/genai)
- **Architecture**: Component-based with API routes

## 📁 Project Structure

- `pages/`:
    - `_app.tsx`: Global layout with navigation
    - `index.tsx`: Dashboard page
    - `sandboxes.tsx`: Interactive dev environments
    - `jobs.tsx`: Batch training jobs
    - `models.tsx`: Model management
    - `datasets.tsx`: Dataset management
    - `files.tsx`: File and artifact management
    - `admin.tsx`: Admin panel
    - `api/gemini/`: API routes for Gemini AI services
- `components/`:
    - `Dashboard.tsx`: Real-time cluster metrics and visualization
    - `Sandboxes.tsx`: Interactive dev environments (VS Code/Terminal)
    - `BatchJobs.tsx`: Distributed training job submission
    - `FileManagement.tsx`: Shared artifacts and model publishing
    - `ModelManagement.tsx`: Registry for trained weights and versions
    - `DatasetManagement.tsx`: Data source and storage management
    - `AdminPanel.tsx`: Global policies and scheduling rules
- `services/`:
    - `geminiService.ts`: Client-side service for AI features
- `types.ts` & `constants.tsx`: Centralized data structures and mock data

## 🔑 Environment Variables

Create a `.env.local` file with the following variable:

```bash
# Google Gemini API Key for AI-powered insights
# Get your API key from: https://ai.google.dev/
GEMINI_API_KEY=your_gemini_api_key_here
```

## 📜 Features at a Glance

- **GPU Virtualization**: Supports fractional GPU slicing (e.g., 0.1 GPU) for lightweight tasks
- **GitOps Integration**: Submit training jobs directly from repository URLs
- **Remote Dev**: Connect via VS Code Remote-SSH or a high-performance Web Terminal
- **Artifact Lifecycle**: Automatically track model checkpoints and publish them to the internal Model Registry
- **AI Observability**: Real-time log summarization and error debugging powered by Gemini
- **Secure API Routes**: Server-side API calls protect your API keys

## 🚦 Development Notes

### Hot Reloading
Next.js provides fast refresh for immediate feedback during development. Changes to components, pages, and API routes are reflected instantly.

### TypeScript
The project uses TypeScript for type safety. Type checking is performed during development and build time.

### Tailwind CSS
Utility-first CSS framework is configured and ready to use. Custom styles can be added to `styles/globals.css`.

---
*Built by World-Class Frontend Engineers.*
