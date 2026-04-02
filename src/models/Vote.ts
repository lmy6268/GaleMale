import mongoose, { Schema, Document } from 'mongoose';

export interface IVote extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: string; // 카카오 로그인 고유 ID 식별자
  selectedPlaceId: string;
  createdAt: Date;
  expiresAt: Date; // 방 마감 혹은 결과 기록 후 파기되는 TTL 값
}

const VoteSchema = new Schema<IVote>({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  userId: { type: String, required: true },
  selectedPlaceId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

// TTL Index 핵심 원칙:
// expiresAt에 도달하면 이 투표의 세부 로그를 MongoDB에서 스케줄러 없이 자동으로 자동 삭제합니다!
// Room 객체에는 집계된 결과 숫자(voteCount)가 남지만, "누가 어디에 투표했는지"는 이 설정으로 파기되어 DB공간을 절약합니다.
VoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VoteSchema.index({ roomId: 1, userId: 1, selectedPlaceId: 1 }, { unique: true }); // 동일 방에서 한 사람이 동일 장소에 중복 투표만 방지 (다른 장소에는 투표 가능)

export default mongoose.models.Vote || mongoose.model<IVote>('Vote', VoteSchema);
