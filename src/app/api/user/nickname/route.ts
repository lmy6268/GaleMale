import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/user/nickname - 현재 사용자 닉네임 조회
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ nickname: null });
    }

    await connectToDatabase();
    const kakaoUserId = (session.user as Record<string, unknown>).id as string || session.user.email || '';
    const user = await User.findOne({ kakaoUserId }).lean();

    return NextResponse.json({ nickname: user?.nickname || null });
  } catch (error) {
    console.error('Nickname fetch error:', error);
    return NextResponse.json({ nickname: null });
  }
}

/**
 * PUT /api/user/nickname - 닉네임 등록/수정
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nickname } = await request.json();

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json({ error: '닉네임을 입력해주세요.' }, { status: 400 });
    }

    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      return NextResponse.json({ error: '닉네임은 1~20자 사이로 입력해주세요.' }, { status: 400 });
    }

    await connectToDatabase();
    const kakaoUserId = (session.user as Record<string, unknown>).id as string || session.user.email || '';

    const user = await User.findOneAndUpdate(
      { kakaoUserId },
      { kakaoUserId, nickname: trimmed },
      { upsert: true, new: true }
    );

    return NextResponse.json({ nickname: user.nickname });
  } catch (error) {
    console.error('Nickname update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
