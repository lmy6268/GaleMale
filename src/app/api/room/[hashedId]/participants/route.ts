import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Room from '@/models/Room';
import Vote from '@/models/Vote';
import User from '@/models/User';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ hashedId: string }> }
) {
  try {
    await connectToDatabase();
    const { hashedId } = await params;

    // 1. 방 정보 조회 (장소 이름 매핑용)
    const room = await Room.findOne({ hashedId }).lean();
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // 2. 해당 방의 모든 투표 데이터 조회
    const votes = await Vote.find({ roomId: (room as any)._id }).lean();
    
    // 3. 사용자별로 투표 그룹화
    const userVoteMap = new Map<string, string[]>();
    votes.forEach((v: any) => {
      const current = userVoteMap.get(v.userId) || [];
      userVoteMap.set(v.userId, [...current, v.selectedPlaceId]);
    });

    // 4. 사용자 정보(닉네임, 이미지) 조회 및 결과 조립
    const userIds = Array.from(userVoteMap.keys());
    const users = await User.find({ kakaoUserId: { $in: userIds } }).lean();

    const result = users.map((u: any) => {
      const votedPlaceIds = userVoteMap.get(u.kakaoUserId) || [];
      // placeId를 실제 이름으로 변환
      const votedPlaces = votedPlaceIds.map(pId => {
        const option = (room as any).options.find((o: any) => o.placeId === pId);
        return option ? option.name : '알 수 없는 장소';
      });

      return {
        kakaoUserId: u.kakaoUserId,
        nickname: u.nickname,
        image: u.image,
        places: votedPlaces
      };
    });

    // 만약 투표 데이터는 있는데 User 테이블에 없는 경우(동기화 전 투표자 등) 처리
    const foundUserIds = new Set(users.map((u: any) => u.kakaoUserId));
    const missingUserIds = userIds.filter(id => !foundUserIds.has(id));
    
    missingUserIds.forEach(id => {
      const votedPlaceIds = userVoteMap.get(id) || [];
      const votedPlaces = votedPlaceIds.map(pId => {
        const option = (room as any).options.find((o: any) => o.placeId === pId);
        return option ? option.name : '알 수 없는 장소';
      });

      result.push({
        kakaoUserId: id,
        nickname: '익명 참여자',
        image: '',
        places: votedPlaces
      });
    });

    return NextResponse.json({ participants: result });
  } catch (error: unknown) {
    console.error('Fetch participants error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
