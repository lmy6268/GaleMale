import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaceOption {
  placeId: string; // 카카오/네이버 자체 장소 ID
  name: string; // 상호명
  address: string; // 주소
  category: string; // 분류 (예: 식당 > 양식)
  rating?: number; // 평점 (옵션)
  placeUrl?: string; // 카카오맵 링크
  x: string; // 경도
  y: string; // 위도
  imageUrl?: string; // 가게 대표 이미지 URL
  voteCount: number; // 집계된 표 수
}

export interface IRoom extends Document {
  hashedId: string; // URL 라우팅용 암호화(난수) 아이디
  title: string;
  deadline: Date;
  isClosed: boolean;
  allowMultipleVotes: boolean; // 중복 투표 허용 여부
  allowAddOptions: boolean; // 투표 진행 중 장소 추가 허용 여부
  options: IPlaceOption[];
  creatorUserId: string; // 투표 방 생성자 식별자 (카카오 ID 등)
  createdAt: Date;
}

const PlaceOptionSchema = new Schema<IPlaceOption>({
  placeId: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  category: { type: String, required: true },
  rating: { type: Number },
  placeUrl: { type: String },
  x: { type: String, required: true },
  y: { type: String, required: true },
  imageUrl: { type: String },
  voteCount: { type: Number, default: 0 }
});

const RoomSchema = new Schema<IRoom>({
  hashedId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  deadline: { type: Date, required: true },
  isClosed: { type: Boolean, default: false },
  allowMultipleVotes: { type: Boolean, default: false },
  allowAddOptions: { type: Boolean, default: false },
  options: [PlaceOptionSchema],
  creatorUserId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
