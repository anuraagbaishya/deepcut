import { Routes, Route } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import GamePage from './pages/GamePage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SetupPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
