/**
 * 카카오 맵 카테고리 문자열을 분석하여 가장 적합한 아이콘(이모지)을 반환합니다.
 * 추후 Lucide-react 아이콘 등으로 변경 가능합니다.
 */
export function getCategoryIcon(categoryName: string = '', name: string = '') {
  const fullText = (categoryName + ' ' + name).toLowerCase();

  if (fullText.includes('고기') || fullText.includes('육류') || fullText.includes('갈비') || fullText.includes('삼겹살')) return '🥩';
  if (fullText.includes('카페') || fullText.includes('커피') || fullText.includes('디저트')) return '☕';
  if (fullText.includes('일식') || fullText.includes('초밥') || fullText.includes('회') || fullText.includes('가츠')) return '🍣';
  if (fullText.includes('중식') || fullText.includes('짜장') || fullText.includes('마라탕')) return '🥡';
  if (fullText.includes('양식') || fullText.includes('파스타') || fullText.includes('피자') || fullText.includes('스테이크')) return '🍝';
  if (fullText.includes('술집') || fullText.includes('호프') || fullText.includes('포차') || fullText.includes('이자카야')) return '🍺';
  if (fullText.includes('치킨')) return '🍗';
  if (fullText.includes('분식') || fullText.includes('떡볶이')) return '🍢';
  if (fullText.includes('한식') || fullText.includes('밥집') || fullText.includes('백반')) return '🍱';
  if (fullText.includes('관광') || fullText.includes('명소') || fullText.includes('공원')) return '🌳';
  if (fullText.includes('숙박') || fullText.includes('호텔')) return '🏨';
  
  return '📍'; // 기본 아이콘
}

export function getCategoryColor(categoryName: string = '') {
  if (categoryName.includes('카페')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (categoryName.includes('고기')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  if (categoryName.includes('술집')) return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
  return 'bg-slate-800 text-slate-400 border-white/5';
}
