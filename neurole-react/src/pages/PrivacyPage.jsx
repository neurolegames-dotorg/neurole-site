import pageStyle from './styles/PrivacyPage.css?raw'
import { usePageStyle } from '../hooks/usePageStyle'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  usePageStyle(pageStyle)
  useDocumentHead({
    title: 'Privacy Policy — Neurole',
    description: 'What information Neurole collects, why, and what choices you have. Free, no ads, no data selling.',
    canonical: '/privacy',
  })

  return (
    <>
      <div className="page-hero"><div className="wrap">
      <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: August 1, 2026</p>
      </div></div>
      
      <main className="wrap legal-body" style={{ padding: '36px 0 70px', maxWidth: '760px' }}>
      
        <p>This policy explains what information Neurole collects, why, and what choices you have. Neurole is free, has no ads, and doesn't sell your data. If anything here is unclear, email us at <a href="mailto:neurolegames@gmail.com">neurolegames@gmail.com</a>.</p>
      
        <h2>Google Analytics, plainly</h2>
        <p>Before the legal detail below, here's the short version of the one third-party tool most visitors actually interact with:</p>
      
        <div className="nutrition-label">
          <div className="nutrition-label-head">
            <strong>Google Analytics — Privacy Summary</strong>
            <span>neurole.org</span>
          </div>
          <div className="nutrition-row"><dt>What it collects</dt><dd>Pages you visit, how long you stay, general device/browser type, approximate location (city-level, from IP address — we don't see your exact address), and which site referred you here.</dd></div>
          <div className="nutrition-row"><dt>What it does NOT collect</dt><dd>Your name, email, or any game answers/guesses, unless you separately sign in or submit a form — those are handled separately (see below).</dd></div>
          <div className="nutrition-row"><dt>Why we use it</dt><dd>To see which pages and games are actually used, so we know what to improve. That's it — no ad targeting.</dd></div>
          <div className="nutrition-row"><dt>Who it's shared with</dt><dd>Google (as the analytics provider). We don't sell or otherwise share this data with anyone else.</dd></div>
          <div className="nutrition-row"><dt>How long it's kept</dt><dd>Per Google's default retention settings for this property (currently 14 months), after which it's automatically deleted.</dd></div>
          <div className="nutrition-row"><dt>Your choice</dt><dd>Install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics Opt-out Browser Add-on</a>, or use a browser/extension that blocks analytics scripts. The site works identically either way.</dd></div>
        </div>
      
        <h2>Information we collect</h2>
        <p><strong>Automatically, when you visit:</strong> basic usage data via Google Analytics (see above), and — for the global "Guess Distribution" feature on The Daily Case — an anonymous count of your daily result (e.g. "solved in 3 tries"), stored via Firebase with no personal identifier attached.</p>
        <p><strong>Information you choose to provide:</strong></p>
        <ul>
          <li>If you sign in with Google, we receive your name and email address to track your streak and save your progress across visits.</li>
          <li>If you submit the volunteer, contact, or "Create a Case" form, the information you type (name, email, message) is sent to us via Formspree.</li>
          <li>If you ask the built-in AI tutor a question, that question is sent to our AI provider (Groq) to generate a response. We don't attach your name or email to these requests.</li>
        </ul>
        <p><strong>Stored on your device:</strong> your streak, past guesses, and theme preference are stored in your browser's local storage, not on our servers, and stay on your device unless you're signed in.</p>
      
        <h2>How we use information</h2>
        <ul>
          <li>To operate the games (track your streak, save your progress, show global stats).</li>
          <li>To understand usage patterns and improve the site.</li>
          <li>To respond to messages sent through our forms.</li>
          <li>We do not use your information for advertising, and we do not sell it to anyone.</li>
        </ul>
      
        <h2>Third-party services we use</h2>
        <ul>
          <li><strong>Google Analytics</strong> — site usage statistics.</li>
          <li><strong>Google Sign-In</strong> — optional account sign-in.</li>
          <li><strong>Firebase (Google)</strong> — stores anonymous, aggregate daily results for the community comparison feature.</li>
          <li><strong>Groq</strong> — powers the AI tutor ("Explain") feature.</li>
          <li><strong>Formspree</strong> — processes our contact, volunteer, and case-submission forms.</li>
        </ul>
        <p>Each of these providers has its own privacy policy governing how it handles data on its end.</p>
      
        <h2>Children's privacy</h2>
        <p>Neurole is an educational resource used by a range of ages, including high school students. We do not knowingly collect personal information from children under 13 beyond what's described above (and Google Sign-In is optional — the games are fully playable without ever providing your name or email). If you believe a child under 13 has provided us personal information without appropriate consent, contact us and we'll remove it.</p>
      
        <h2>Data retention & security</h2>
        <p>We keep information only as long as needed for the purposes above. Form submissions are retained in our inbox until we act on them; analytics data follows Google's retention settings; account data (if you sign in) is retained until you ask us to delete it. No method of storage or transmission is 100% secure, but we take reasonable steps to protect what we hold.</p>
      
        <h2>Your choices</h2>
        <ul>
          <li>You can use every game without signing in or providing any personal information.</li>
          <li>You can opt out of Google Analytics using the link above.</li>
          <li>You can ask us to delete any information we hold about you by emailing <a href="mailto:neurolegames@gmail.com">neurolegames@gmail.com</a>.</li>
        </ul>
      
        <h2>Changes to this policy</h2>
        <p>If we make material changes, we'll update the date at the top of this page. Continued use of Neurole after a change means you accept the updated policy.</p>
      
        <h2>Contact</h2>
        <p>Questions about this policy: <a href="mailto:neurolegames@gmail.com">neurolegames@gmail.com</a>.</p>
      
        <p style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid var(--rule)', fontSize: '12.5px' }}>This page is provided as general information about our data practices and is not legal advice.</p>
      
      </main>
    </>
  )
}
