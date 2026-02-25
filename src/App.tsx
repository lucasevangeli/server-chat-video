import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VideoChat } from './components/VideoChat';
import { LandingPage } from './components/LandingPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<VideoChat />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;