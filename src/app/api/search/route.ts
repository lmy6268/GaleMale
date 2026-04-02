import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const x = searchParams.get('x');
  const y = searchParams.get('y');
  const radius = searchParams.get('radius') || '3000'; // 기본 반경 3km로 상향 조정
  const page = searchParams.get('page') || '1';
  const categoryGroupCode = searchParams.get('category_group_code');

  // 검색어도 없고 카테고리 코드도 없다면 에러
  if (!query && !categoryGroupCode) {
    return NextResponse.json({ error: 'Search query or category_group_code is required' }, { status: 400 });
  }

  const KAKAO_REST_API_KEY = process.env.KAKAO_CLIENT_ID;

  if (!KAKAO_REST_API_KEY) {
    return NextResponse.json({ error: 'Kakao REST API Key is missing in environment variables.' }, { status: 500 });
  }

  try {
    // 키워드가 있으면 keyword API, 키워드가 없고 카테고리만 있으면 category API 사용
    const baseUrl = `https://dapi.kakao.com/v2/local/search/${query ? 'keyword' : 'category'}.json`;
    let url = `${baseUrl}?size=15&page=${page}`;
    
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (categoryGroupCode) url += `&category_group_code=${categoryGroupCode}`;
    
    // x, y 좌표가 있으면 반경 검색 추가
    if (x && y) {
      url += `&x=${x}&y=${y}&radius=${radius}`;
    }

    const kakaoRes = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!kakaoRes.ok) {
      const errorData = await kakaoRes.json();
      return NextResponse.json({ error: 'Kakao API Error', details: errorData }, { status: kakaoRes.status });
    }

    const data = await kakaoRes.json();
    const documents = data.documents || [];

    // 각 장소에 대해 대표 이미지 검색 (병렬 처리로 속도 확보)
    const resultsWithImages = await Promise.all(
      documents.map(async (doc: any) => {
        try {
          const imageSearchUrl = `https://dapi.kakao.com/v2/search/image?query=${encodeURIComponent(
            `${doc.place_name} ${doc.address_name.split(' ').slice(0, 2).join(' ')}`
          )}&size=1`;
          
          const imgRes = await fetch(imageSearchUrl, {
            headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
          });
          
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            return {
              ...doc,
              imageUrl: imgData.documents?.[0]?.image_url || null
            };
          }
        } catch (err) {
          console.error(`Image search failed for ${doc.place_name}:`, err);
        }
        return { ...doc, imageUrl: null };
      })
    );

    return NextResponse.json({ 
      results: resultsWithImages,
      meta: data.meta 
    });
  } catch (error) {
    console.error('Search Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
