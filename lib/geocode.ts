/**
 * Kakao Local 주소 검색을 통해 한국 주소 → (위도, 경도) 변환.
 *
 * KAKAO_REST_API_KEY 가 설정되지 않았거나 요청이 실패하면 null 을 돌려준다.
 * 호출부는 null 을 "좌표 없음" 으로 그대로 저장한다 (lat/lng 컬럼 nullable).
 *
 * 키 발급: https://developers.kakao.com → 앱 → 플랫폼: 사이트 도메인 등록 →
 * 동의항목 불필요 → REST API 키를 그대로 사용.
 */
export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      documents?: { x?: string; y?: string }[];
    };
    const hit = json.documents?.[0];
    if (!hit?.x || !hit?.y) return null;
    const lng = Number(hit.x);
    const lat = Number(hit.y);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}
