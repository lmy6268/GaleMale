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
    const Vote = (await import('@/models/Vote')).default; // 다이나믹 임포트로 순환 참조 방지
    const uniqueVoters = await Vote.distinct('userId', { roomId: (roomData as any)._id });
    const participantCount = uniqueVoters.length;

    // 방장(생성자) 정보 가져오기
    const User = (await import('@/models/User')).default;
    const creatorInfo = await User.findOne({ kakaoUserId: roomData.creatorUserId }).select('nickname image').lean();

    return NextResponse.json({
      ...roomData,
      participantCount,
      creatorNickname: creatorInfo?.nickname || '알 수 없는 사용자',
      creatorImage: creatorInfo?.image || null
    });
  } catch (error: unknown) {
    console.error('Room fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

interface UpdateRoomBody {
  title?: string;
  deadline?: string;
  allowMultipleVotes?: boolean;
  allowAddOptions?: boolean;
  isClosed?: boolean;
  options?: any[]; // options structure is complex, using any[] for now or defining it properly
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
    const body: UpdateRoomBody = await req.json();
    const { title, deadline, allowMultipleVotes, allowAddOptions, isClosed, options } = body;

    const room = await Room.findOne({ hashedId });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 방장 권한 확인
    const sessionUser = session.user as { id?: string, email?: string };
    const currentUserId = sessionUser.id || sessionUser.email;
    if (room.creatorUserId !== currentUserId) {
      return NextResponse.json({ error: 'Only the creator can edit this room' }, { status: 403 });
    }

    // 필드 업데이트
    if (title) room.title = title;
    if (deadline) room.deadline = new Date(deadline);
    if (typeof allowMultipleVotes === 'boolean') room.allowMultipleVotes = allowMultipleVotes;
    if (typeof allowAddOptions === 'boolean') room.allowAddOptions = allowAddOptions;
    if (typeof isClosed === 'boolean') room.isClosed = isClosed;
    if (options && Array.isArray(options)) {
      room.options = options;
    }

    await room.save();
    return NextResponse.json({ success: true, room });
  } catch (error: unknown) {
    console.error('Room update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const room = await Room.findOne({ hashedId });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 방장 권한 확인
    const sessionUser = session.user as { id?: string, email?: string };
    const currentUserId = sessionUser.id || sessionUser.email;
    if (room.creatorUserId !== currentUserId) {
      return NextResponse.json({ error: 'Only the creator can delete this room' }, { status: 403 });
    }

    // 방과 관련된 모든 투표 데이터 삭제 (종속성 정리)
    const Vote = (await import('@/models/Vote')).default;
    await Vote.deleteMany({ roomId: room._id });
    
    // 방 삭제
    await Room.deleteOne({ _id: room._id });

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error: unknown) {
    console.error('Room deletion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

