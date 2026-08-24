export type ChecklistCategory =
  | "docs"
  | "electronics"
  | "clothes"
  | "toiletries"
  | "etc";

export interface ChecklistTemplateItem {
  label: string;
  category: ChecklistCategory;
}

export const CHECKLIST_CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  docs: "필수서류",
  electronics: "전자기기",
  clothes: "의류",
  toiletries: "세면도구",
  etc: "기타",
};

export const CHECKLIST_TEMPLATES: ChecklistTemplateItem[] = [
  // 필수서류
  { label: "여권", category: "docs" },
  { label: "항공권", category: "docs" },
  { label: "숙소 바우처", category: "docs" },
  { label: "해외결제 카드", category: "docs" },
  { label: "현금/환전", category: "docs" },
  { label: "여행자 보험 증권", category: "docs" },
  { label: "비자/전자여행허가", category: "docs" },
  { label: "국제운전면허증", category: "docs" },
  // 전자기기
  { label: "여행용 어댑터(돼지코)", category: "electronics" },
  { label: "보조배터리", category: "electronics" },
  { label: "충전 케이블", category: "electronics" },
  { label: "로밍/eSIM", category: "electronics" },
  { label: "멀티 USB 충전기", category: "electronics" },
  // 의류
  { label: "속바지/양말", category: "clothes" },
  { label: "겉옷/외투", category: "clothes" },
  { label: "편한 신발", category: "clothes" },
  { label: "잠옷", category: "clothes" },
  { label: "선글라스/모자", category: "clothes" },
  // 세면도구
  { label: "칫솔/치약", category: "toiletries" },
  { label: "클렌징/스킨케어", category: "toiletries" },
  { label: "자외선 차단제", category: "toiletries" },
  { label: "샴푸/린스 미니", category: "toiletries" },
  // 기타
  { label: "상비약", category: "etc" },
  { label: "우산/우비", category: "etc" },
  { label: "목베개", category: "etc" },
  { label: "여행용 가위/멀티툴", category: "etc" },
  { label: "간식", category: "etc" },
];
