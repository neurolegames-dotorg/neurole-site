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
   6. Also set GROQ_API_KEY to "DEPLOYED_VIA_WORKER" in config.js
      so the frontend knows not to call Groq directly
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
      // Reflect the origin only when it is on the allowlist; otherwise send a
      // value the browser will reject, so a page on another origin can't read
      // the response.
      "Access-Control-Allow-Origin": allowed ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    // Reject cross-origin callers outright. A same-origin fetch from the site
    // sends its Origin header, so the real games still pass.
    if (origin && !allowed) return new Response("Forbidden origin", { status: 403, headers: cors });

    const json = (obj) => new Response(JSON.stringify(obj), {
      headers: { ...cors, "Content-Type": "application/json" }
    });

    try {
      const body = await request.json().catch(() => ({}));
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return json({ answer: "No prompt received." });
      if (prompt.length > MAX_PROMPT_CHARS) return json({ answer: "That question is too long — please shorten it." });

      // Try Groq models in order
      const models = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
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
        } catch (e) { /* try next */ }
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
    } catch (e) {
      return json({ answer: "Something went wrong — please try again." });
    }
  }
};
