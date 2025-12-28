import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Homepage from './pages/Homepage';
import Explore from './pages/Explore';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
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
import SignupPage from './pages/Signup';
import VerifyOtpPage from './pages/VerifyOtp';
import CompleteProfilePage from './pages/CompleteProfile';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './pages/ProfilePage';
import { Toaster } from 'sonner';

import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="*" element={<MainLayout />} />
        </Routes>
        <Toaster position="top-center" richColors closeButton expand={false} />
      </Router>
    </ThemeProvider>
  );
}

// Helper component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// MainLayout component that includes Navbar and conditionally renders Footer
function MainLayout() {
  const location = useLocation();
  const hideFooter =
    location.pathname === '/ai-chat' ||
    location.pathname === '/chat-mode' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/verify-otp' ||
    location.pathname === '/complete-profile' ||
    location.pathname === '/events/create';

  return (
    <div className="min-h-screen font-inter">
      <Navbar />
      <main className={location.pathname === '/events/create' ? '' : 'bg-white'}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/create" element={<CreateEvent />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/invest" element={<Invest />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/community" element={<Community />} />
          <Route path="/ai-tool" element={<AITool />} />
          <Route path="/ai-chat" element={<NewChat />} />
          <Route path="/chat-mode" element={<ChatMode />} />
          <Route path="/download" element={<Download />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export default App;