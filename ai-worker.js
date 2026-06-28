/* =====================================================================
   NEUROLE — AI backend (Cloudflare Worker)
   Tries Gemini first. If Gemini isn't configured or fails for any
   reason, it automatically falls back to OpenAI — so the "ask a
   question" feature keeps working even if one provider has an outage,
   a quota issue, or you haven't set up a key for it yet.

   ===================================================================
   WHY THIS HAS TO BE A SEPARATE BACKEND (not just code in your site)
   ===================================================================
   Your website's HTML/JS is fully visible to anyone who opens dev
   tools. An API key pasted directly into your site would be stolen
   within minutes. This Worker is a tiny middleman that lives on
   Cloudflare's servers — your site calls THIS, and only this Worker
   holds your real API key(s), which stay encrypted and invisible to
   site visitors.

   ===================================================================
   HOW TO DEPLOY (free, ~5–10 minutes)
   ===================================================================
   1. Get API keys (you only NEED one of these, but adding both gives
      you the automatic fallback):
        Gemini: https://aistudio.google.com/apikey   (free tier)
        OpenAI: https://platform.openai.com/api-keys  (pay-as-you-go,
                requires billing set up even for small usage)

   2. Go to https://workers.cloudflare.com -> sign up/log in (free).

   3. Create a new Worker -> replace the default code with THIS ENTIRE
      FILE.

   4. In the Worker's Settings -> Variables and Secrets, add:
        GEMINI_API_KEY   (paste your Gemini key)   -- optional
        OPENAI_API_KEY   (paste your OpenAI key)   -- optional
      Add whichever you have as a Secret (so it's encrypted). You can
      add one or both.

   5. Deploy. You'll get a URL like:
        https://neurole-ai.yourname.workers.dev

   6. Paste that URL into config.js as AI_ENDPOINT_URL.

   That's it — both games' "ask a question" chat will now work,
   automatically using whichever provider is available.
===================================================================== */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: corsHeaders });
    }

    const jsonResponse = (obj) =>
      new Response(JSON.stringify(obj), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    try {
      const { region, function_text, question } = await request.json();

      const prompt = `You are a friendly neuroscience tutor inside an educational game called Neurole.
A player just learned about: "${region}".
Background info they were given: "${function_text}"
The player's follow-up question is: "${question}"

Answer clearly and concisely (2-4 sentences), in plain language suitable for a curious learner who is not a medical professional. Stay focused on neuroscience/neuroanatomy/clinical neurology relevant to their question.`;

      // ---------- Try Gemini first ----------
      if (env.GEMINI_API_KEY) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            }
          );
          const data = await geminiRes.json();
          const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (geminiRes.ok && answer) {
            return jsonResponse({ answer, provider: "gemini" });
          }
          console.error("Gemini returned no usable answer:", data);
        } catch (err) {
          console.error("Gemini request failed:", err.message);
        }
      }

      // ---------- Fall back to OpenAI ----------
      if (env.OPENAI_API_KEY) {
        try {
          const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 300,
            }),
          });
          const data = await openaiRes.json();
          const answer = data?.choices?.[0]?.message?.content;
          if (openaiRes.ok && answer) {
            return jsonResponse({ answer, provider: "openai" });
          }
          console.error("OpenAI returned no usable answer:", data);
        } catch (err) {
          console.error("OpenAI request failed:", err.message);
        }
      }

      // ---------- Both providers failed or neither is configured ----------
      return jsonResponse({
        answer:
          "I couldn't reach an AI provider right now. Double-check that GEMINI_API_KEY or OPENAI_API_KEY is set correctly in this Worker's settings.",
      });

    } catch (err) {
      return jsonResponse({
        answer: "Something went wrong reaching the AI — please try again.",
      });
    }
  },
};
