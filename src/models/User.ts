import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  kakaoUserId: string; // 카카오 고유 ID
  nickname: string;    // 사용자가 직접 설정한 닉네임
  image?: string;      // 카카오 프로필 이미지 URL
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  kakaoUserId: { type: String, required: true, unique: true, index: true },
  nickname: { type: String, required: true, maxlength: 20 },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
