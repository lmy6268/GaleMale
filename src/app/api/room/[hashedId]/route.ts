import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Room from '@/models/Room';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ hashedId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { hashedId } = await params;

    const roomData = await Room.findOne({ hashedId }).lean();
    if (!roomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 투표에 참여한 고유 사용자 수 카운트
    const Vote = (await import('@/models/Vote')).default; // 다이나믹 임포트로 순환 참조 방지 및 필요한 경우 로드
    const uniqueVoters = await Vote.distinct('userId', { roomId: roomData._id });
    const participantCount = uniqueVoters.length;

    return NextResponse.json({
      ...roomData,
      participantCount
    });
  } catch (error: any) {
    console.error('Room fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ hashedId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { hashedId } = await params;
    const body = await req.json();
    const { title, deadline, allowMultipleVotes, allowAddOptions, options } = body;

    const room = await Room.findOne({ hashedId });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 방장 권한 확인
    const currentUserId = (session.user as any).id || session.user.email;
    if (room.creatorUserId !== currentUserId) {
      return NextResponse.json({ error: 'Only the creator can edit this room' }, { status: 403 });
    }

    // 필드 업데이트
    if (title) room.title = title;
    if (deadline) room.deadline = new Date(deadline);
    if (typeof allowMultipleVotes === 'boolean') room.allowMultipleVotes = allowMultipleVotes;
    if (typeof allowAddOptions === 'boolean') room.allowAddOptions = allowAddOptions;
    if (options && Array.isArray(options)) {
      // 기존 옵션에 없는 새로운 장소만 추가하거나 전체 교체 (여기서는 전체 교체 로직 예시)
      // 실제로는 중복 체크 후 push하는 것이 안전함
      room.options = options;
    }

    await room.save();
    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error('Room update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
