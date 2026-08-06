import pageStyle from './styles/VolunteerPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useState } from 'react'
import { Link } from 'react-router-dom'

/* SEO: description="Volunteer with Neurole — write clinical cases, curate brain images, build features, or grow our community. Free, CV-worthy, real impact." */
/* OG: title="Join the Team — Neurole", url="https://neurole.org/volunteer.html" */
/* Twitter: title="Join the Team — Neurole" */

const ROLES = [
  'Writing cases',
  'Brain images',
  'Fact-checking',
  'Engineering',
  'Design',
  'Outreach',
  'Media & content'
]

export default function VolunteerPage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: "Join the Team — Neurole",
    description: "Volunteer with Neurole — write clinical cases, curate brain images, build features, or grow our community. Free, CV-worthy, real impact.",
    canonical: "/volunteer",
  });
  const [selectedRoles, setSelectedRoles] = useState([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')

  function toggleRole(role) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    setSending(true)
    try {
      const rolesInput = document.createElement('input')
      rolesInput.type = 'hidden'
      rolesInput.name = 'roles'
      rolesInput.value = selectedRoles.length ? selectedRoles.join(', ') : 'Not specified'
      form.appendChild(rolesInput)

      const subj = document.createElement('input')
      subj.type = 'hidden'
      subj.name = '_subject'
      subj.value = 'Neurole — New volunteer: ' + (name || 'Anonymous')
      form.appendChild(subj)

      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
      if (res.ok) {
        setSent(true)
      } else {
        alert('Something went wrong — please try again or email us at neurolegames@gmail.com')
        setSending(false)
      }
    } catch {
      alert('Something went wrong — please try again or email us at neurolegames@gmail.com')
      setSending(false)
    }
  }

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
          <h1>Join Us</h1>
          <p>Neurole is built by people who think learning the nervous system should feel like a game. Add your skills — any background welcome.</p>
        </div>
      </div>

      <div style={{ background: '#6A5098', padding: '28px 0' }}>
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, textAlign: 'center' }}>
          <div><div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>Free</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', marginTop: 4 }}>To join, always</div></div>
          <div><div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>CV</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', marginTop: 4 }}>Worthy experience</div></div>
          <div><div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>Real</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', marginTop: 4 }}>Science impact</div></div>
        </div>
      </div>

      <main className="wrap" style={{ padding: '36px 0 60px' }}>
        <div className="role-grid">
          <div className="role-card">
            <span className="role-tag">Clinical</span>
            <h3>Write Daily Cases</h3>
            <p>Have clinical or neuroscience training? Draft new patient scenarios and symptom progressions for The Daily Case.</p>
          </div>
          <div className="role-card">
            <span className="role-tag">Science</span>
            <h3>Curate Brain Images</h3>
            <p>Help source and label MRI and diagram images and answer choices for Map the Brain.</p>
          </div>
          <div className="role-card">
            <span className="role-tag">Research</span>
            <h3>Fact-Check Fun Facts</h3>
            <p>Find and verify a peer-reviewed study behind each week's neuroscience fun fact.</p>
          </div>
          <div className="role-card">
            <span className="role-tag">Tech</span>
            <h3>Build &amp; Design</h3>
            <p>Engineers and designers welcome — help us ship new game modes and improve the experience.</p>
          </div>
          <div className="role-card">
            <span className="role-tag">Outreach</span>
            <h3>Grow the Community</h3>
            <p>Email neuroscience clubs, partner with universities, manage social media, and help bring Neurole to more students and clinicians worldwide.</p>
          </div>
          <div className="role-card">
            <span className="role-tag">Media</span>
            <h3>Create Content</h3>
            <p>Produce Instagram, TikTok, and YouTube content based on game cases — short explainers, diagnostic challenges, and behind-the-scenes neuroscience.</p>
          </div>
        </div>

        <div className="synapse-rule"><span className="node"></span><span className="node"></span><span className="node"></span></div>

        <div className="interest-form-wrap" id="create-a-case">
          {sent ? (
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, textAlign: 'center', padding: '28px 0 16px', color: 'var(--ink)' }}>
              Thanks for reaching out! 🧠<br /><span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, color: 'var(--ink-soft)' }}>We'll be in touch at your email soon.</span>
            </p>
          ) : (
            <>
              <h3>Get in touch</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, margin: '-6px 0 18px' }}>Tell us what you'd like to help with and we'll reach out.</p>

              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-soft)', marginBottom: 10 }}>I'm interested in</p>
              <div className="role-chips">
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    className={'role-chip' + (selectedRoles.includes(role) ? ' selected' : '')}
                    onClick={() => toggleRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <form id="volunteer-form" action="https://formspree.io/f/maqgkjlr" method="POST" onSubmit={handleSubmit}>
                <div className="field"><label>Name</label><input type="text" name="name" placeholder="Your name" required value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="field"><label>Email</label><input type="email" name="email" placeholder="you@example.com" required /></div>
                <div className="field"><label>Background (optional)</label><input type="text" name="background" placeholder="e.g. Neuroscience BSc, 2nd year · Pre-med · Graphic designer" /></div>
                <div className="field"><label>Anything else to share? (optional)</label>
                  <textarea name="notes" rows="3" placeholder="Background, ideas, questions…" style={{ fontFamily: 'var(--serif-body)', fontSize: 15, padding: '9px 10px', border: '1px solid var(--ink-soft)', borderRadius: 4, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}></textarea>
                </div>
                <button className="btn" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={sending}>
                  {sending ? 'Sending…' : 'Join Us →'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="synapse-rule" style={{ margin: '36px 0 28px' }}><span className="node"></span><span className="node"></span><span className="node"></span></div>

        <span className="section-eyebrow">Partnerships</span>
        <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 20, margin: '0 0 8px' }}>Working with organizations who share our mission</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, margin: '0 0 6px', maxWidth: 560 }}>Neurole partners with universities, student groups, and neuroscience organizations to expand free access to brain science education.</p>
        <div className="partner-grid">
          <a className="partner-card partner-card-logo" href="https://www.the-neuroseed-foundation.org" target="_blank" rel="noopener">
            <img src="https://primary.jwwb.nl/public/s/t/p/temp-tssbucrnphjkszleoicx/neuroseed-1-high-74ru4t.png?enable-io=true&enable=upscale&height=200" alt="The NeuroSeed Foundation" />
          </a>
          <div className="partner-card">Your Org Here</div>
          <div className="partner-card">Your Org Here</div>
          <div className="partner-card">Your Org Here</div>
        </div>
        <Link className="btn ghost" to="/contact" style={{ marginTop: 18, display: 'inline-flex' }}>Become a Partner →</Link>
      </main>
    </>
  )
}
