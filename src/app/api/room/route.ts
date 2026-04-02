import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Room from '@/models/Room';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 카카오 로그인 기반 인증 확인 (보안 필수 요건)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please login with Kakao.' }, { status: 401 });
    }

    await connectToDatabase();
    
    const body = await req.json();
    const { title, deadline, options, allowMultipleVotes, allowAddOptions } = body;

    // 입력값 검증
    if (!title || !deadline || !options || !Array.isArray(options)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 예측 불가능한 해시 ID 생성 (URL 라우팅용)
    const hashedId = crypto.randomBytes(8).toString('hex');

    const newRoom = await Room.create({
      hashedId,
      title,
      deadline: new Date(deadline),
      allowMultipleVotes: !!allowMultipleVotes,
      allowAddOptions: !!allowAddOptions,
      options: options.map((opt: any) => ({
        ...opt,
        voteCount: 0
      })),
      creatorUserId: (session.user as any).id || session.user.email || 'Unknown Kakao User', 
    });

    return NextResponse.json({ success: true, hashedId: newRoom.hashedId });
  } catch (error: any) {
    console.error('Room creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
