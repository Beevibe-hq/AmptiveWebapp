import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Homepage from './pages/Homepage';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Invest from './pages/Invest';
import Shop from './pages/Shop';
import Community from './pages/Community';
import AITool from './pages/AITool';
import NewChat from './pages/NewChat';
import ChatMode from './pages/ChatMode';
import Help from './pages/Help';
import Download from './pages/Download';
import LoginPage from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<MainLayout />} />
      </Routes>
    </Router>
  );
}

// MainLayout component that includes Navbar and conditionally renders Footer
function MainLayout() {
  const location = useLocation();
  const hideFooter = location.pathname === '/ai-chat' || location.pathname === '/chat-mode';

  return (
    <div className="min-h-screen font-inter">
      <Navbar />
      <main className="bg-white">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/invest" element={<Invest />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/community" element={<Community />} />
          <Route path="/ai-tool" element={<AITool />} />
          <Route path="/ai-chat" element={<NewChat />} />
          <Route path="/chat-mode" element={<ChatMode />} />
          <Route path="/help" element={<Help />} />
          <Route path="/download" element={<Download />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export default App;