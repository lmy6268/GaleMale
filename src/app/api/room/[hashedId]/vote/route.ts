import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Room from '@/models/Room';
import Vote from '@/models/Vote';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET - 사용자가 이 방에서 이미 투표했는지 여부 확인
 */
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
    const userId = (session.user as any).id || session.user.email || '';
    const { hashedId } = await params;

    const room = await Room.findOne({ hashedId }).select('_id');
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const votes = await Vote.find({ roomId: room._id, userId }).select('selectedPlaceId');
    const selectedPlaceIds = votes.map(v => v.selectedPlaceId);

    return NextResponse.json({ 
      hasVoted: votes.length > 0, 
      selectedPlaceIds,
      selectedPlaceId: selectedPlaceIds[0] || null // 하위 호환
    });
  } catch (error: any) {
    console.error('Vote check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - 투표하기
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ hashedId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { placeId } = await req.json();
    if (!placeId) return NextResponse.json({ error: 'Place ID required' }, { status: 400 });

    await connectToDatabase();
    const userId = (session.user as any).id || session.user.email || '';
    const { hashedId } = await params;

    const room = await Room.findOne({ hashedId });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.isClosed || new Date(room.deadline) < new Date()) {
      return NextResponse.json({ error: 'Voting is closed' }, { status: 400 });
    }

    // 중복 투표 권한 체크
    const existingVotes = await Vote.find({ roomId: room._id, userId });
    
    // 이미 이 장소에 투표했는지 확인 (장소별 중복 투표는 무조건 금지)
    const alreadyVotedThis = existingVotes.some(v => v.selectedPlaceId === placeId);
    if (alreadyVotedThis) return NextResponse.json({ error: 'Already voted for this place' }, { status: 400 });

    // 방 설정이 중복 투표 불허인데 이미 어디든 투표했다면 오류
    if (!room.allowMultipleVotes && existingVotes.length > 0) {
      return NextResponse.json({ error: 'Multiple votes not allowed in this room' }, { status: 400 });
    }

    // 투표 기록 저장
    await Vote.create({
      roomId: room._id,
      userId,
      selectedPlaceId: placeId,
      expiresAt: room.deadline,
    });

    // Room의 옵션 카운트 업데이트
    await Room.updateOne(
      { _id: room._id, 'options.placeId': placeId },
      { $inc: { 'options.$.voteCount': 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Voting error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE - 투표 취소 (수정하기 클릭 시)
 */
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
    const userId = (session.user as any).id || session.user.email || '';
    const { hashedId } = await params;

    const room = await Room.findOne({ hashedId });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.isClosed || new Date(room.deadline) < new Date()) {
      return NextResponse.json({ error: 'Voting is closed. Cannot modify vote.' }, { status: 400 });
    }

    // 이 사용자의 모든 투표 데이터 찾기
    const userVotes = await Vote.find({ roomId: room._id, userId });
    if (userVotes.length === 0) return NextResponse.json({ success: true, message: 'No votes to delete' });

    // Room의 옵션들에서 투표수 차감
    for (const vote of userVotes) {
      await Room.updateOne(
        { _id: room._id, 'options.placeId': vote.selectedPlaceId },
        { $inc: { 'options.$.voteCount': -1 } }
      );
    }

    // 투표 기록 삭제
    await Vote.deleteMany({ roomId: room._id, userId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Vote cancellation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT - 벌크 투표 업데이트 (여러 장소 선택 후 한 번에 저장)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ hashedId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { placeIds } = await req.json();
    if (!Array.isArray(placeIds)) {
      return NextResponse.json({ error: 'placeIds array required' }, { status: 400 });
    }

    await connectToDatabase();
    const userId = (session.user as any).id || session.user.email || '';
    const { hashedId } = await params;

    const room = await Room.findOne({ hashedId });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.isClosed || new Date(room.deadline) < new Date()) {
      return NextResponse.json({ error: 'Voting is closed' }, { status: 400 });
    }

    // 방 설정 체크 (중복 투표 비허용인데 여러 개를 보낸 경우)
    if (!room.allowMultipleVotes && placeIds.length > 1) {
      return NextResponse.json({ error: 'Multiple votes not allowed in this room' }, { status: 400 });
    }

    // 1. 기존 투표 찾기 및 차감
    const existingVotes = await Vote.find({ roomId: room._id, userId });
    for (const vote of existingVotes) {
      await Room.updateOne(
        { _id: room._id, 'options.placeId': vote.selectedPlaceId },
        { $inc: { 'options.$.voteCount': -1 } }
      );
    }
    
    // 2. 기존 투표 삭제
    await Vote.deleteMany({ roomId: room._id, userId });

    // 3. 새로운 투표 저장 및 증가
    if (placeIds.length > 0) {
      const voteDocs = placeIds.map(pId => ({
        roomId: room._id,
        userId,
        selectedPlaceId: pId,
        expiresAt: room.deadline,
      }));
      
      await Vote.insertMany(voteDocs);

      for (const pId of placeIds) {
        await Room.updateOne(
          { _id: room._id, 'options.placeId': pId },
          { $inc: { 'options.$.voteCount': 1 } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Bulk voting error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
