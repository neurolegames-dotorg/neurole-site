import pageStyle from './styles/ContactPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useState } from 'react'
import { Link } from 'react-router-dom'

/* SEO: description="Get in touch with the Neurole team. Questions, feedback, error reports, press inquiries, or collaboration ideas — we read everything." */
/* OG: title="Contact Us — Neurole", url="https://neurole.org/contact.html" */
/* Twitter: title="Contact Us — Neurole" */

export default function ContactPage() {
  usePageStyle(pageStyle);
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    setSending(true)
    setError('')
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong — please try again.')
        setSending(false)
      }
    } catch {
      setError('Something went wrong — please try again.')
      setSending(false)
    }
  }

  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
        <h1>Contact Us</h1>
        <p>Questions, feedback, corrections, or press inquiries — we'd love to hear from you.</p>
      </div></div>

      <main className="wrap" style={{ padding: '36px 0 70px' }}>
        <div className="contact-grid">
          <div className="contact-card">
            <h3>General inquiries</h3>
            <p>Questions about the games, feedback on a case, or anything else about Neurole.</p>
            <a className="btn" href="mailto:neurolegames@gmail.com">Email us →</a>
          </div>
          <div className="contact-card">
            <h3>Report a mistake</h3>
            <p>Found a clinical error or incorrect brain region? Accuracy matters — let us know.</p>
            <a className="btn" href="mailto:neurolegames@gmail.com?subject=Error%20Report">Report an error →</a>
          </div>
          <div className="contact-card">
            <h3>Join &amp; collaborate</h3>
            <p>Interested in writing cases, contributing images, or helping build the site?</p>
            <Link className="btn ghost" to="/volunteer">Join Us →</Link>
          </div>
          <div className="contact-card">
            <h3>Press &amp; media</h3>
            <p>Writing about Neurole or neuroscience education? We'll get back to you promptly.</p>
            <a className="btn ghost" href="mailto:neurolegames@gmail.com?subject=Press%20Inquiry">Press inquiry →</a>
          </div>
        </div>

        <div className="synapse-rule" style={{ maxWidth: 820 }}><span className="node"></span><span className="node"></span><span className="node"></span></div>

        <div style={{ maxWidth: 820, marginTop: 32 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Send us a message</h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-soft)', margin: '0 0 20px' }}>Or email us directly: <a href="mailto:neurolegames@gmail.com" style={{ color: 'var(--neuro-blue-deep)' }}>neurolegames@gmail.com</a></p>

          {sent ? (
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: 'var(--neuro-blue-deep)', padding: 24, background: 'rgba(107,79,148,.07)', borderRadius: 12, textAlign: 'center' }}>
              ✓ Message sent — we'll be in touch soon!
            </div>
          ) : (
            <form id="contact-form" className="msg-form" action="https://formspree.io/f/maqgkjlr" method="POST" onSubmit={handleSubmit}>
              <input type="hidden" name="_subject" value="Neurole — Contact form message" />
              <input type="hidden" name="type" value="contact" />
              <div className="field">
                <label>Your name</label>
                <input type="text" name="name" placeholder="First and last name" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" name="email" placeholder="you@example.com" required />
              </div>
              <div className="field">
                <label>Topic</label>
                <select name="topic">
                  <option>General question</option>
                  <option>Error or correction</option>
                  <option>Join Us interest</option>
                  <option>Press inquiry</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="field">
                <label>Message</label>
                <textarea name="message" rows="4" placeholder="Tell us what's on your mind…" required></textarea>
              </div>
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--signal-red)', padding: '12px 16px', background: 'rgba(168,68,58,.07)', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
              <button className="btn" type="submit" id="contact-submit-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={sending}>
                {sending ? 'Sending…' : 'Send message'}
              </button>
              <p id="contact-success" style={{ display: sent ? 'block' : 'none', fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: '#3a7d5a', textAlign: 'center', marginTop: 14 }}>✓ Message sent! We'll reply to your email soon.</p>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
