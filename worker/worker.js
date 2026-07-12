const PROMPT = `分析这张食物照片，估算整体营养成分。用户补充描述："{DESC}"

请直接返回一个 JSON 对象，不要任何其他文字：
{"description":"食物简短描述","cal":整数千卡,"carb":整数克碳水,"protein":整数克蛋白质,"fat":整数克脂肪}`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }

    try {
      const { image, description } = await request.json();
      if (!image) return json({ error: 'missing image' }, 400);

      const base64 = image.split(',')[1];
      const mime = image.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      const prompt = PROMPT.replace('{DESC}', description || '无');

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: base64 } },
            ]}],
          }),
        }
      );

      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        return json({ error: 'Gemini API error', detail: err }, 502);
      }

      const geminiData = await geminiRes.json();
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*?\}/);
      if (!match) return json({ error: 'parse failed', raw: text }, 500);

      const result = JSON.parse(match[0]);
      return json(result);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
