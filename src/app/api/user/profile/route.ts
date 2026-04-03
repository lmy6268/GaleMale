import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nickname } = await req.json();
    if (!nickname || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    if (nickname.length > 20) {
      return NextResponse.json({ error: 'Nickname must be less than 20 characters' }, { status: 400 });
    }

    await connectToDatabase();
    // @ts-ignore
    const userId = session.user.id;

    const updatedUser = await User.findOneAndUpdate(
      { kakaoUserId: userId },
      { nickname: nickname.trim() },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Nickname updated successfully',
      nickname: updatedUser.nickname 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
