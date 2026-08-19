import { Component } from 'react';

// Catches a page that fails to load or throws while rendering.
//
// Pages are code-split, so each route is fetched on demand. A chunk request
// that fails — a dropped connection, or an old hashed filename that 404s
// because a deploy landed while the tab was open — rejects inside React.lazy.
// With nothing to catch it, React unmounts the whole tree and the visitor is
// left looking at a blank white page with only a console message to explain
// it. That is the worst possible failure: silent, and indistinguishable from
// the site being down.
//
// A reload fixes the stale-chunk case outright, since the fresh HTML points at
// the new filenames — so the recovery offered here is the one that works.
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Neurole: page failed to load', error && error.message);
  }

  componentDidUpdate(prevProps) {
    // Navigating away from the broken route clears the error, so one bad page
    // does not wedge the rest of the site for the session.
    if (this.state.failed && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="wrap" style={{ padding: '90px 0 110px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 12px'
        }}>Page didn’t load</p>
        <h1 style={{ fontFamily: 'var(--serif-display)', fontSize: 30, margin: '0 0 14px' }}>
          Something went wrong opening this page.
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 15.5, lineHeight: 1.7, margin: '0 0 26px' }}>
          This usually means the connection dropped, or the site updated while
          this tab was open. Reloading should sort it.
        </p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </main>
    );
  }
}
