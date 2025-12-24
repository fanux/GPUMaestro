
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Sandboxes from './components/Sandboxes';
import BatchJobs from './components/BatchJobs';
import ModelManagement from './components/ModelManagement';
import DatasetManagement from './components/DatasetManagement';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'sandboxes':
        return <Sandboxes />;
      case 'jobs':
        return <BatchJobs />;
      case 'models':
        return <ModelManagement />;
      case 'datasets':
        return <DatasetManagement />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
