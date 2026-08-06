import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SignInModal from './SignInModal';
import SubscribeModal from './SubscribeModal';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  const location = useLocation();
  const isGamePlay = location.pathname.includes('-play');

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
