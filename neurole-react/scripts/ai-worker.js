/* =====================================================================
   NEUROLE AI WORKER — Cloudflare Worker (Groq backend)
   Keys stay server-side, never exposed in your public GitHub repo.

   DEPLOY IN 5 MINUTES:
   1. Go to workers.cloudflare.com → sign up free → Create a Worker
   2. Paste this entire file as the worker code
   3. Settings → Variables and Secrets → add:
        GROQ_API_KEY   →  (paste your Groq key from console.groq.com)
      (add it as a Secret so it's encrypted — never visible to anyone)
   4. Deploy → copy the worker URL (e.g. https://neurole-ai.yourname.workers.dev)
   5. In your GitHub repo, open config.js and set:
        AI_ENDPOINT_URL: "https://neurole-ai.yourname.workers.dev"
   6. Nothing else. config.js has no provider-key fields any more and the
      client has no direct-to-provider code path, so AI_ENDPOINT_URL is the
      only switch.
   7. Add any new site origin to ALLOWED_ORIGINS below, or the browser will
      be refused with a 403.
   ===================================================================== */

// Only these origins may call the worker. Without an allowlist the CORS "*"
// below turns this into an open LLM proxy: anyone could POST prompts all day
// and spend the account's Groq/OpenAI quota. Add any preview/staging origin
// here if you deploy one.
const ALLOWED_ORIGINS = [
  "https://neurole.org",
  "https://www.neurole.org",
  "http://localhost:5173",
  "http://localhost:8080",
];

// Hard cap on prompt size — the tutor answers short questions, so anything
// larger is either abuse or a mistake, and it bounds token spend per request.
const MAX_PROMPT_CHARS = 2000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      // Responses differ by Origin, so caches must key on it.
      "Vary": "Origin",
    };
    // Only an allowlisted origin gets the header at all. Sending
    // "Access-Control-Allow-Origin: null" as a rejection is worse than sending
    // nothing: "null" is a real origin, produced by sandboxed iframes and
    // data: URLs, so a page there would have matched it.
    if (allowed) cors["Access-Control-Allow-Origin"] = origin;

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    // A missing Origin is rejected along with a wrong one. The previous check
    // was `origin && !allowed`, which let anything without the header straight
    // through — and non-browser clients simply do not send one, so `curl` had
    // full use of the key this worker exists to hide. Browsers always attach
    // Origin to a cross-origin POST, so the games are unaffected.
    if (!allowed) return new Response("Forbidden origin", { status: 403, headers: cors });

    const json = (obj) => new Response(JSON.stringify(obj), {
      headers: { ...cors, "Content-Type": "application/json" }
    });

    try {
      const body = await request.json().catch(() => ({}));
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return json({ answer: "No prompt received." });
      if (prompt.length > MAX_PROMPT_CHARS) return json({ answer: "That question is too long — please shorten it." });

      // Groq retired the llama-3.x and gemma2 model IDs on 2026-06-17. The
      // list here still named them, so every Groq call would have 404'd and
      // the tutor would have fallen through to "temporarily unavailable" the
      // moment it was wired up — a failure that only shows after deployment.
      const models = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
      for (const model of models) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + env.GROQ_API_KEY
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: "You are a friendly neuroscience tutor in an educational game. Answer in 2-4 clear, engaging sentences for a student." },
                { role: "user", content: prompt }
              ],
              max_tokens: 350,
              temperature: 0.7
            })
          });
          const data = await res.json();
          const answer = data?.choices?.[0]?.message?.content?.trim();
          if (res.ok && answer) return json({ answer, model });
          if (res.status === 401) break; // bad key, stop trying
        } catch { /* try next */ }
      }

      // Fallback to OpenAI if configured
      if (env.OPENAI_API_KEY) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.OPENAI_API_KEY },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 350 })
        });
        const data = await res.json();
        const answer = data?.choices?.[0]?.message?.content?.trim();
        if (res.ok && answer) return json({ answer, model: "gpt-4o-mini" });
      }

      return json({ answer: "AI is temporarily unavailable — please try again in a moment." });
    } catch {
      return json({ answer: "Something went wrong — please try again." });
    }
  }
};
