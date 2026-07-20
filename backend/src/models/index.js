const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  handle: { type: String, required: true, unique: true, minlength: 3, maxlength: 24, match: /^[a-zA-Z0-9_]+$/ },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  points: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

const TierSchema = new Schema({
  _id: { type: String }, // slug, e.g. "recon"
  index: { type: Number, required: true },
  name: { type: String, required: true },
  tagline: { type: String, required: true },
  color: { type: String, required: true },
  sortOrder: { type: Number, required: true },
}, { _id: false });

const HintSubSchema = new Schema({
  idx: { type: Number, required: true },
  cost: { type: Number, required: true },
  text: { type: String, required: true },
}, { _id: false });

const LabSchema = new Schema({
  _id: { type: String }, // slug, e.g. "r1"
  tierId: { type: String, ref: "Tier", required: true },
  name: { type: String, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard", "Insane"], required: true },
  points: { type: Number, required: true },
  summary: { type: String, required: true },
  brief: { type: String, required: true },
  mode: { type: String, enum: ["chat", "written"], required: true },
  targetSystemPrompt: { type: String }, // chat mode only
  winCondition: { type: String }, // chat mode only
  judgeSystemPrompt: { type: String }, // written mode only
  bannedWord: { type: String }, // optional client-side keyword filter
  hints: { type: [HintSubSchema], default: [] },
  sortOrder: { type: Number, required: true },
}, { _id: false });

const SolveSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  labId: { type: String, ref: "Lab", required: true },
  pointsAwarded: { type: Number, required: true },
  cleanSolve: { type: Boolean, default: false },
}, { timestamps: { createdAt: "solvedAt", updatedAt: false } });
SolveSchema.index({ userId: 1, labId: 1 }, { unique: true });

const HintPurchaseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  labId: { type: String, ref: "Lab", required: true },
  hintIdx: { type: Number, required: true },
  cost: { type: Number, required: true },
}, { timestamps: { createdAt: "purchasedAt", updatedAt: false } });
HintPurchaseSchema.index({ userId: 1, labId: 1, hintIdx: 1 }, { unique: true });

const AchievementSchema = new Schema({
  _id: { type: String }, // slug
  name: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const UserAchievementSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  achievementId: { type: String, ref: "Achievement", required: true },
}, { timestamps: { createdAt: "unlockedAt", updatedAt: false } });
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

const ChatMessageSubSchema = new Schema({
  role: { type: String, enum: ["user", "assistant", "blocked"], required: true },
  content: { type: String, required: true },
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });

const ChatSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  labId: { type: String, ref: "Lab", required: true },
  messages: { type: [ChatMessageSubSchema], default: [] },
}, { timestamps: true });
ChatSessionSchema.index({ userId: 1, labId: 1 }, { unique: true });

const SubmissionAttemptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  labId: { type: String, ref: "Lab", required: true },
  verdictSuccess: { type: Boolean, required: true },
  judgeReason: { type: String, default: "" },
}, { timestamps: { createdAt: "attemptedAt", updatedAt: false } });
SubmissionAttemptSchema.index({ userId: 1, labId: 1 });

module.exports = {
  User: mongoose.model("User", UserSchema),
  Tier: mongoose.model("Tier", TierSchema),
  Lab: mongoose.model("Lab", LabSchema),
  Solve: mongoose.model("Solve", SolveSchema),
  HintPurchase: mongoose.model("HintPurchase", HintPurchaseSchema),
  Achievement: mongoose.model("Achievement", AchievementSchema),
  UserAchievement: mongoose.model("UserAchievement", UserAchievementSchema),
  ChatSession: mongoose.model("ChatSession", ChatSessionSchema),
  SubmissionAttempt: mongoose.model("SubmissionAttempt", SubmissionAttemptSchema),
};
