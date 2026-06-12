import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Plans from './pages/Plans';
import PlanBuilder from './pages/PlanBuilder';
import Training from './pages/Training';
import Replay from './pages/Replay';
import Reports from './pages/Reports';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="plans" element={<Plans />} />
        <Route path="plans/build" element={<PlanBuilder />} />
        <Route path="training/:planId" element={<Training />} />
        <Route path="replay/:sessionId" element={<Replay />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
