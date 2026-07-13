const PROMPT = `Analyze this food photo and estimate the overall nutritional content. User note: "{DESC}"

Return ONLY a JSON object, no other text:
{"description":"brief food description in Chinese","cal":integer_kcal,"carb":integer_grams_carbs,"protein":integer_grams_protein,"fat":integer_grams_fat}`;

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

      let base64 = image.includes(',') ? image.split(',')[1] : image;
      base64 = base64.replace(/\s/g, '');
      const pad = base64.length % 4;
      if (pad) base64 += '='.repeat(4 - pad);
      const imageBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const prompt = PROMPT.replace('{DESC}', description || 'none');

      const result = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        image: [...imageBytes],
      });

      const text = result.response || result.description || JSON.stringify(result);
      const match = text.match(/\{[\s\S]*?\}/);
      if (!match) return json({ error: 'parse failed', raw: text, result }, 500);

      const parsed = JSON.parse(match[0]);
      return json(parsed);
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
