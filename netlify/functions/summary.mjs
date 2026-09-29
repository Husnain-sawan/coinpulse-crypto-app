export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "content-type": "application/json" } });
  }
  try {
    const body = await request.json();
    const coins = Array.isArray(body.coins) ? body.coins.slice(0, 50) : [];
    if (!coins.length) return Response.json({ summary: "No market data was provided.", mode: "local" });
    const apiKey = Netlify.env.get("GEMINI_API_KEY");
    if (apiKey) {
      const compact = coins.map(c => ({
        name: String(c.name || "").slice(0, 60),
        symbol: String(c.symbol || "").slice(0, 12),
        price: Number(c.price),
        change24h: Number(c.change24h),
        marketCap: Number(c.marketCap),
        volume: Number(c.volume)
      }));
      const prompt = "Write a concise, neutral cryptocurrency market snapshot based only on this JSON market data. Mention broad 24-hour movement, notable gainers and decliners, and uncertainty. Do not predict prices or advise buying/selling. State that changes are for the last 24 hours. Maximum 180 words. Data: " + JSON.stringify(compact);
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 300 } })
      });
      if (response.ok) {
        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
        if (summary) return Response.json({ summary, mode: "ai" });
      }
    }
    const valid = coins.filter(c => Number.isFinite(Number(c.change24h)));
    const avg = valid.reduce((sum, c) => sum + Number(c.change24h), 0) / Math.max(1, valid.length);
    const top = [...valid].sort((a,b) => Number(b.change24h)-Number(a.change24h)).slice(0,3);
    const down = [...valid].sort((a,b) => Number(a.change24h)-Number(b.change24h)).slice(0,3);
    const pct = n => `${Number(n)>=0?"+":""}${Number(n).toFixed(2)}%`;
    const summary = `Across ${valid.length} tracked coins, the simple average 24-hour change is ${pct(avg)}. Largest gainers in this list: ${top.map(c=>`${c.name} (${pct(c.change24h)})`).join(", ")}. Largest declines: ${down.map(c=>`${c.name} (${pct(c.change24h)})`).join(", ")}. This is a snapshot of recent movement, not a weighted market index or a forecast.`;
    return Response.json({ summary, mode: "local" });
  } catch {
    return Response.json({ error: "Could not create summary." }, { status: 400 });
  }
};