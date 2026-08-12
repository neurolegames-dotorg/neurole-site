import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SignInModal from './SignInModal';
import SubscribeModal from './SubscribeModal';
import ScrollToTop from './ScrollToTop';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useScrollHeader } from '../hooks/useScrollHeader';

export default function Layout() {
  const location = useLocation();
  const isGamePlay = location.pathname.includes('-play');

  // Re-scan on every route change — each page mounts its own cards. Game-play
  // screens render without the masthead and are their own full-screen UI, so
  // neither effect applies there.
  useScrollReveal(location.pathname);
  useScrollHeader(!isGamePlay);

  const [signInOpen, setSignInOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const openSignIn = () => setSignInOpen(true);
  const closeSignIn = () => setSignInOpen(false);
  const openSubscribe = () => setSubscribeOpen(true);
  const closeSubscribe = () => setSubscribeOpen(false);

  return (
    <>
      <ScrollToTop />
      {!isGamePlay && <Header onSignIn={openSignIn} />}
      <Outlet context={{ openSignIn, openSubscribe }} />
      {!isGamePlay && <Footer onSubscribe={openSubscribe} />}
      <SignInModal open={signInOpen} onClose={closeSignIn} />
      <SubscribeModal open={subscribeOpen} onClose={closeSubscribe} />
    </>
  );
}
