/**
 * NVIDIA NIM (OpenAI 호환) 으로 구역 이름 짓기.
 * 묶기는 계산으로 끝났고, 여기서는 이름만 받는다. 실패하면 null 이라 부르는 쪽이 대체 이름을 쓴다.
 */

const URL_CHAT = "https://integrate.api.nvidia.com/v1/chat/completions";
// 2026-11 기준 빠르고(약 2초) JSON 을 잘 지키는 모델. glm-5.3-flash 는 생각 단계 때문에 20~40초 걸린다
const MODEL = "minimaxai/minimax-m3.1-flash";
const MAX_NAME = 30;

/** 응답에서 구역 수만큼의 이름. 모양이 다르면 null */
export function parseNimNames(json: unknown, count: number): (string | null)[] | null {
  const content = (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    const names = (JSON.parse(content) as { names?: unknown }).names;
    if (!Array.isArray(names) || names.length !== count) return null;
    return names.map((n) => (typeof n === "string" && n.trim() ? n.trim().slice(0, MAX_NAME) : null));
  } catch {
    return null;
  }
}

export async function nimAreaNames(
  groups: { places: string[] }[],
  region: string,
  locale: "ko" | "en"
): Promise<(string | null)[] | null> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key || groups.length === 0) return null;
  const language = locale === "ko" ? "Korean" : "English";
  const list = groups.map((g, i) => `${i + 1}. ${g.places.join(", ")}`).join("\n");
  try {
    const res = await fetch(URL_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 200,
        messages: [
          { role: "system", content: "You name travel areas. Reply with JSON only." },
          {
            role: "user",
            content:
              `Trip region: ${region || "unknown"}. Each numbered group below is a set of places close to each other.\n` +
              `Name each group by its neighbourhood or district (like Asakusa or Shibuya), not by a landmark, ` +
              `in ${language}, 2-12 characters, joining two neighbourhoods with "·" when the group spans both. ` +
              `Keep the order. Reply {"names": [...]}\n${list}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "area_names",
            schema: {
              type: "object",
              properties: { names: { type: "array", items: { type: "string" }, minItems: groups.length, maxItems: groups.length } },
              required: ["names"],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    return res.ok ? parseNimNames(await res.json(), groups.length) : null;
  } catch {
    return null;
  }
}
