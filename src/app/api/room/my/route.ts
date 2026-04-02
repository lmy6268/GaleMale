import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Room from '@/models/Room';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * 현재 로그인한 사용자가 생성한 방 목록 조회
 * GET /api/room/my
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as any).id || session.user.email || '';

    const rooms = await Room.find({ creatorUserId: userId })
      .sort({ createdAt: -1 })
      .select('hashedId title deadline isClosed options createdAt')
      .lean();

    // 각 방에 총 투표 수와 옵션 수 요약 정보 추가
    const roomSummaries = rooms.map((room: any) => ({
      hashedId: room.hashedId,
      title: room.title,
      deadline: room.deadline,
      isClosed: room.isClosed,
      optionCount: room.options?.length || 0,
      totalVotes: room.options?.reduce((sum: number, opt: any) => sum + (opt.voteCount || 0), 0) || 0,
      createdAt: room.createdAt,
    }));

    return NextResponse.json({ rooms: roomSummaries });
  } catch (error: any) {
    console.error('My rooms fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
