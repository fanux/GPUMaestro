# GPU Maestro - Management Platform

GPU Maestro is a high-performance, intelligent GPU workload management engine designed for modern AI/ML teams. It provides a commercial-grade interface for managing Kubernetes clusters, interactive sandboxes, batch training jobs, and model artifacts.

## 🚀 Getting Started

Since this project uses modern ES6 modules and Import Maps, it can be run directly in the browser without a heavy build step.

### Prerequisites
- A modern web browser (Chrome, Edge, or Safari) that supports [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).
- A local static file server.

### Running Locally

1. **Using Node.js (Recommended)**:
   ```bash
   npx serve .
   ```
   *This will serve the project at `http://localhost:3000`.*

2. **Using Python**:
   ```bash
   python -m http.server 8000
   ```
   *Access the app at `http://localhost:8000`.*

3. **Using VS Code**:
   Install the **Live Server** extension and click "Go Live" at the bottom right of the editor while `index.html` is open.

## 🛠 Tech Stack

- **Framework**: React 19 (via ESM)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Intelligence**: Google Gemini API (@google/genai)
- **Architecture**: Component-based ES Modules

## 📁 Project Structure

- `index.html`: Entry point with CDN links and Import Maps.
- `index.tsx`: Main React mounting script.
- `App.tsx`: Root component handling navigation and layout.
- `components/`:
    - `Dashboard.tsx`: Real-time cluster metrics and visualization.
    - `Sandboxes.tsx`: Interactive dev environments (VS Code/Terminal).
    - `BatchJobs.tsx`: Distributed training job submission (Git/Image).
    - `FileManagement.tsx`: Shared artifacts and model publishing.
    - `ModelManagement.tsx`: Registry for trained weights and versions.
    - `DatasetManagement.tsx`: Data source and storage quota management.
    - `AdminPanel.tsx`: Global policies, hardware health, and scheduling rules.
- `services/`:
    - `geminiService.ts`: AI-driven log analysis and scheduling optimization.
- `types.ts` & `constants.tsx`: Centralized data structures and mock data.

## 🔑 Note on API Keys

The application utilizes the **Google Gemini API** for log analysis and scheduling advice. The `process.env.API_KEY` is expected to be available in the environment. For certain high-quality generation tasks (like Veo or Pro models), the app will prompt you to select a paid API key via a secure dialog.

## 📜 Features at a Glance

- **GPU Virtualization**: Supports fractional GPU slicing (e.g., 0.1 GPU) for lightweight tasks.
- **GitOps Integration**: Submit training jobs directly from repository URLs.
- **Remote Dev**: Connect via VS Code Remote-SSH or a high-performance Web Terminal.
- **Artifact Lifecycle**: Automatically track model checkpoints and publish them to the internal Model Registry.
- **AI Observability**: Real-time log summarization and error debugging powered by Gemini.

---
*Built by World-Class Frontend Engineers.*