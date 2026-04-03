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
    
    // 1. 영어/한글만 허용 (숫자, 공백, 특수문자 불가) & 3~20자
    const nicknameRegex = /^[a-zA-Z가-힣]{3,20}$/;
    if (!nicknameRegex.test(trimmed)) {
      return NextResponse.json({ error: '3~20자의 영문 또는 한글만 입력 가능합니다.' }, { status: 400 });
    }

    await connectToDatabase();
    const kakaoUserId = (session.user as Record<string, unknown>).id as string || session.user.email || '';

    // 3. 중복 체크 (본인 제외)
    const existingUser = await User.findOne({ 
      nickname: trimmed, 
      kakaoUserId: { $ne: kakaoUserId } 
    });
    
    if (existingUser) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 400 });
    }

    const user = await User.findOneAndUpdate(
      { kakaoUserId },
      { kakaoUserId, nickname: trimmed },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ nickname: user.nickname });
  } catch (error) {
    console.error('Nickname update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
