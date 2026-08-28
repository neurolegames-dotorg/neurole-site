export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });

    const json = (obj) => new Response(JSON.stringify(obj), {
      headers: { ...cors, "Content-Type": "application/json" }
    });

    try {
      const { prompt } = await request.json();
      if (!prompt) return json({ answer: "No prompt received." });

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

      return json({ answer: "AI is temporarily unavailable." });
    } catch (e) {
      return json({ answer: "Error, please try again." });
    }
  }
};
