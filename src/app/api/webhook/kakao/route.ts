import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
// import Room from '@/models/Room'; // 방 삭제 시 주석 해제
import Vote from '@/models/Vote';

/**
 * 카카오 연결 해제 웹훅 (User Unlinked)
 *
 * 사용자가 카카오 계정 관리 등 서비스 외부에서 앱 연결을 해제했을 때
 * 카카오가 이 엔드포인트로 POST 요청을 보냅니다.
 *
 * 요청 헤더: Authorization: KakaoAK {PRIMARY_ADMIN_KEY}
 * 페이로드: { app_id, user_id, referrer_type }
 * 응답: 3초 이내 200 OK
 */
export async function POST(request: NextRequest) {
  try {
    // Admin Key 검증
    const authorization = request.headers.get('authorization');
    const expectedAuth = `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`;

    if (!authorization || authorization !== expectedAuth) {
      console.warn('[Kakao Webhook] Unauthorized request');
      // 카카오 권장: 오류 시에도 200 반환
      return NextResponse.json({ status: 'unauthorized' }, { status: 200 });
    }

    const body = await request.json();
    const { app_id, user_id, referrer_type } = body;

    console.log(`[Kakao Webhook] User unlinked - user_id: ${user_id}, referrer_type: ${referrer_type}, app_id: ${app_id}`);

    // DB 연결 후 사용자 관련 데이터 정리
    await connectToDatabase();

    // 해당 사용자의 투표 데이터 삭제
    const voteResult = await Vote.deleteMany({ oderId: user_id });
    console.log(`[Kakao Webhook] Deleted ${voteResult.deletedCount} votes for user ${user_id}`);

    // 해당 사용자가 생성한 방 삭제 (선택적 - 필요시 주석 해제)
    // const roomResult = await Room.deleteMany({ creatorId: user_id });
    // console.log(`[Kakao Webhook] Deleted ${roomResult.deletedCount} rooms for user ${user_id}`);

    console.log(`[Kakao Webhook] User ${user_id} data cleanup completed`);

    // 3초 이내 200 OK 응답 필수
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[Kakao Webhook] Error processing webhook:', error);
    // 카카오 권장: 오류 시에도 200 OK 반환
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

// 카카오 웹훅 테스트용 GET 핸들러
export async function GET() {
  return NextResponse.json({ status: 'Kakao webhook endpoint is active' });
}
