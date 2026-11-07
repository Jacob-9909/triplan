/**
 * NVIDIA NIM (OpenAI 호환): 구역 이름 짓기, 후보 장소 추천, 예약 메일 읽기.
 * 모두 JSON 스키마로 답을 받고, 실패하면 null 이라 부르는 쪽이 대체 동작을 한다.
 * AI 답은 믿지 않는다: 모양·길이를 여기서 검사하고, 장소는 부르는 쪽이 지도 검색으로 위치를 다시 확인한다.
 */

const URL_CHAT = "https://integrate.api.nvidia.com/v1/chat/completions";
// 2026-11 기준 JSON 을 잘 지키는 빠른 편 모델. glm-5.3-flash 는 생각 단계 때문에 20~40초 걸린다
const MODEL = "minimaxai/minimax-m3.1-flash";
const MAX_NAME = 30;

/** 응답 본문(choices[0].message.content)을 JSON 으로. 코드 울타리(```json)가 붙어 와도 벗긴다 */
export function nimContent(json: unknown): unknown {
  const content = (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    return null;
  }
}

/** 응답에서 구역 수만큼의 이름. 모양이 다르면 null */
export function parseNimNames(json: unknown, count: number): (string | null)[] | null {
  const names = (nimContent(json) as { names?: unknown } | null)?.names;
  if (!Array.isArray(names) || names.length !== count) return null;
  return names.map((n) => (typeof n === "string" && n.trim() ? n.trim().slice(0, MAX_NAME) : null));
}

/** JSON 스키마 응답 한 번. 키가 없거나 실패·시간 초과면 null (응답 원문 JSON 을 돌려준다) */
export async function nimChat(opts: {
  system: string;
  user: string;
  name: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
  temperature?: number;
}): Promise<unknown> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(URL_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.maxTokens,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: { type: "json_schema", json_schema: { name: opts.name, schema: opts.schema } },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
      cache: "no-store",
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function nimAreaNames(
  groups: { places: string[] }[],
  region: string,
  locale: "ko" | "en"
): Promise<(string | null)[] | null> {
  if (groups.length === 0) return null;
  const language = locale === "ko" ? "Korean" : "English";
  const list = groups.map((g, i) => `${i + 1}. ${g.places.join(", ")}`).join("\n");
  const raw = await nimChat({
    name: "area_names",
    system: "You name travel areas. Reply with JSON only.",
    user:
      `Trip region: ${region || "unknown"}. Each numbered group below is a set of places close to each other.\n` +
      `Name each group by its neighbourhood or district (like Asakusa or Shibuya), not by a landmark, ` +
      `in ${language}, 2-12 characters, joining two neighbourhoods with "·" when the group spans both. ` +
      `Keep the order. Reply {"names": [...]}\n${list}`,
    schema: {
      type: "object",
      properties: { names: { type: "array", items: { type: "string" }, minItems: groups.length, maxItems: groups.length } },
      required: ["names"],
    },
    maxTokens: 200,
    // 무료 엔드포인트라 응답이 5~25초로 들쭉날쭉하다. 화면은 기다리는 동안 "이름 짓는 중" 을 보여 준다
    timeoutMs: 20_000,
  });
  return raw ? parseNimNames(raw, groups.length) : null;
}
