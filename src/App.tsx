import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Homepage from './pages/Homepage';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Invest from './pages/Invest';
import Shop from './pages/Shop';
import Community from './pages/Community';
import AITool from './pages/AITool';
import Help from './pages/Help';
import Download from './pages/Download';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white font-inter">
        <Navbar />
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/invest" element={<Invest />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/community" element={<Community />} />
          <Route path="/ai-tool" element={<AITool />} />
          <Route path="/help" element={<Help />} />
          <Route path="/download" element={<Download />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;