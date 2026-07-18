import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Homepage from './pages/Homepage';
import Explore from './pages/Explore';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
import CheckoutPage from './pages/CheckoutPage';
import EventDetail from './pages/EventDetail';
import Help from './pages/Help';
import Invest from './pages/Invest';
import Shop from './pages/Shop';
import Community from './pages/Community';
import CommunityEvents from './pages/CommunityEvents';
import AITool from './pages/AITool';
import NewChat from './pages/NewChat';
import ChatMode from './pages/ChatMode';
import Download from './pages/Download';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import VerifyOtpPage from './pages/VerifyOtp';
import CompleteProfilePage from './pages/CompleteProfile';
import OAuthCallback from './pages/OAuthCallback';
import PaystackCallback from './pages/PaystackCallback';
import PurchaseConfirmed from './pages/PurchaseConfirmed';
import ProfilePage from './pages/ProfilePage';
import EditProfile from './pages/EditProfile';
import SupportSetup from './pages/SupportSetup';
import MyTickets from './pages/MyTickets';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import FAQs from './pages/FAQs';
import CommunityGuidelines from './pages/CommunityGuidelines';
import Dashboard from './pages/Dashboard';
import SupportProfile from './pages/SupportProfile.tsx';

import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/dashboard/*" element={<DashboardWithSplash />} />
          <Route path="*" element={<MainLayout />} />
        </Routes>
        <Toaster position="top-center" richColors closeButton expand={false} />
      </Router>
    </ThemeProvider>
  );
}

function DashboardWithSplash() {
  const [showRouteSplash, setShowRouteSplash] = React.useState(true);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setShowRouteSplash(false), 850);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {showRouteSplash && <RouteLogoSplash />}
      <Dashboard />
    </>
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

function MainLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const shouldShowRouteSplash =
    location.pathname === '/events/create' ||
    location.pathname === '/explore' ||
    location.pathname === '/profile/support-setup' ||
    location.pathname === '/profile/edit';
  const [showRouteSplash, setShowRouteSplash] = React.useState(shouldShowRouteSplash);

  React.useEffect(() => {
    if (!shouldShowRouteSplash) {
      setShowRouteSplash(false);
      return;
    }

    setShowRouteSplash(true);
    const timeout = window.setTimeout(() => setShowRouteSplash(false), 850);
    return () => window.clearTimeout(timeout);
  }, [location.pathname, shouldShowRouteSplash]);

  const hideFooter =
    location.pathname === '/ai-chat' ||
    location.pathname === '/chat-mode' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/complete-profile' ||
    location.pathname === '/events/create' ||
    (location.pathname.startsWith('/dashboard/events/') && location.pathname.endsWith('/edit')) ||
    location.pathname === '/profile/edit' ||
    location.pathname === '/profile/support-setup' ||
    location.pathname === '/purchase/confirmed' ||
    isDashboard;

  return (
    <div className="min-h-screen font-sans">
      {showRouteSplash && <RouteLogoSplash />}
      {!isDashboard && !location.pathname.startsWith('/support/') && <Navbar />}
      <main className={(location.pathname === '/events/create' || (location.pathname.startsWith('/dashboard/events/') && location.pathname.endsWith('/edit'))) ? '' : isDashboard ? '' : 'bg-white'}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/checkout" element={<CheckoutPage />} />
          <Route path="/invest" element={<Invest />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/:id" element={<CommunityEvents />} />
          <Route path="/help" element={<Help />} />
          <Route path="/ai-tool" element={<AITool />} />
          <Route path="/ai-chat" element={<NewChat />} />
          <Route path="/chat-mode" element={<ChatMode />} />
          <Route path="/download" element={<Download />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/paystack/callback" element={<PaystackCallback />} />
          <Route path="/purchase/confirmed" element={<PurchaseConfirmed />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/support/:id" element={<SupportProfile />} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/profile/support-setup" element={<SupportSetup />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPostDetail />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

function RouteLogoSplash() {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white">
      <div className="flex h-24 w-24 items-center justify-center">
        <svg
          className="h-full w-full animate-pulse text-black"
          width="105"
          height="84"
          viewBox="0 0 105 84"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Amptive"
        >
          <path d="M96.9489 58.3115C96.7382 63.182 96.0281 67.7666 92.1577 68.4573C91.8456 68.5049 91.5725 68.5347 91.276 68.5347C86.7111 68.5347 82.7783 62.3186 78.6114 55.7691C75.8569 51.4524 72.5951 46.3081 69.7158 44.5397C69.0603 44.1348 68.1083 44.1825 67.5465 44.6647C65.1665 46.7249 63.4186 52.4884 61.9828 57.3172C59.7199 64.8551 57.5662 72 52.5175 72C47.4688 72 45.3152 64.861 43.0522 57.3053C41.6164 52.4706 39.8763 46.6832 37.4964 44.6409C36.9423 44.1646 36.0059 44.111 35.3427 44.504C32.4477 46.2247 29.1625 51.4107 26.3846 55.7751C22.2177 62.3246 18.2849 68.5407 13.72 68.5407C13.4235 68.5407 13.1582 68.5109 12.8383 68.4633C8.97567 67.7666 8.26558 63.182 8.05489 58.3115C7.46965 44.6528 11.5741 31.1668 19.8845 19.3003C22.6469 15.3349 26.0179 11.3933 29.8492 12.078C34.773 12.9413 34.7496 20.2589 34.7262 28.0052C34.7262 32.1611 34.7106 37.0078 35.725 39.8777C36.0996 40.9315 37.9646 41.0804 38.6278 40.1099C40.4226 37.4662 41.8193 32.828 43.0132 28.8388C45.2761 21.283 47.4298 14.1441 52.4785 14.1441C57.5272 14.1441 59.6808 21.283 61.9438 28.8566C63.1455 32.8697 64.55 37.5496 66.3604 40.1813C67.0237 41.1459 68.8808 40.997 69.2554 39.9491C70.2854 37.0852 70.2776 32.1969 70.2776 28.0052C70.2542 20.2589 70.2386 12.9413 75.1546 12.078C79.0094 11.3933 82.3569 15.3349 85.1193 19.3003C93.4297 31.1668 97.5107 44.6528 96.9489 58.3115Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export default App;
