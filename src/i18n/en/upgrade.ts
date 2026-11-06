/** 한국어 → 영어 (함께 보기·변경 기록·커버·인쇄·가계부 요약·되돌리기) */
const en: Record<string, string> = {
  // 함께 보기 · 변경 기록
  "함께 보기": "Together",
  "지금 보고 있는 사람": "Viewing now",
  "실시간 연결이 아니라 지금 누가 보는지는 알 수 없어요.": "Not on a live connection, so we can't tell who's viewing right now.",
  "지금은 나만 보고 있어요.": "Only you are viewing right now.",
  "최근 변경": "Recent changes",
  "변경 기록을 불러오지 못했어요.": "Couldn't load the change history.",
  "아직 변경 기록이 없어요. 장소·지출·예약을 바꾸면 여기에 남아요.":
    "No changes yet. Edits to places, expenses and bookings will show up here.",
  "편집 링크 손님": "Guest (edit link)",
  "보기 링크 손님": "Guest (view link)",
  "체험 회원": "Demo member",
  "손님": "Guest",
  "장소 옮김": "Moved a place",
  "장소 삭제": "Deleted a place",
  "지출 추가": "Added an expense",
  "지출 삭제": "Deleted an expense",
  "예약 추가": "Add booking",
  "예약 삭제": "Deleted a booking",
  "여행 정보 수정": "Edited trip details",
  "여행지": "Destination",
  "현지 통화": "Local currency",
  "커버 사진": "Cover photo",
  "체험 공개": "Demo visibility",

  // 헤더 · 메뉴
  "화면 설정": "Display",
  "일정표 인쇄·PDF": "Print itinerary / PDF",
  "커버 사진 바꾸기": "Change cover photo",
  "캘린더에 추가": "Add to calendar",
  "이 여행에서 나갈까요? 다시 들어오려면 주인에게 초대를 받아야 해요.":
    "Leave this trip? You'll need a new invite from the owner to come back.",
  "나가지 못했어요. 잠시 뒤 다시 시도해 주세요.": "Couldn't leave the trip. Please try again in a moment.",

  // 커버 사진
  "기본 사진 (여행지)": "Default photo (destination)",
  "이 여행에서 찍은 사진": "Photos from this trip",
  "아직 올린 사진이 없어요. 장소 상세에서 사진을 올리면 여기서 고를 수 있어요.":
    "No photos yet. Add photos in a place's details and you can pick one here.",
  "사진 주소로 넣기": "Use a photo URL",
  "적용": "Apply",
  "https:// 로 시작하는 사진 주소를 넣어 주세요.": "Enter a photo URL that starts with https://",

  // 일정 지도
  "지도 높이 조절": "Resize map",

  // 되돌리기
  "'{name}' 삭제했어요": "Deleted '{name}'",
  "삭제하지 못했어요.": "Couldn't delete.",
  "장소를 추가하지 못했어요.": "Couldn't add the place.",

  // 가계부 요약
  "여행 중 ({n}일)": "During the trip ({n} days)",
  "하루 평균 {amount}": "{amount} per day",
  "미리 결제·기간 밖": "Paid ahead / outside dates",
  "항공권·숙소 선결제 등": "Flights, hotels paid in advance, etc.",

  // 소개 화면
  "샘플 여행 둘러보기": "Browse a sample trip",
};

export default en;
