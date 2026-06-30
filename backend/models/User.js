import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    preferences: {
      timezone: { type: String, default: 'UTC' },
      defaultPriority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
      },
    },
    dumpCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDumpAt: {
      type: Date,
      default: null,
    },
    subscription: {
      status: {
        type: String,
        enum: ['free', 'active', 'canceled', 'past_due', 'trialing'],
        default: 'free',
      },
      plan: {
        type: String,
        enum: ['free', 'plus', 'pro', 'premium'],
        default: 'free',
      },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      lemonSubscriptionId: { type: String, default: null },
      lemonCustomerId: { type: String, default: null },
      provider: {
        type: String,
        enum: ['stripe', 'lemonsqueezy'],
        default: null,
      },
      currentPeriodEnd: { type: Date, default: null },
      trialEndsAt: { type: Date, default: null },
    },
    aiUsageCount: { type: Number, default: 0 },
    aiUsageMonth: { type: String, default: null },
    voiceUsageCount: { type: Number, default: 0 },
    voiceUsageDay: { type: String, default: null },
    dailyBriefCount: { type: Number, default: 0 },
    dailyBriefDate: { type: String, default: null },
    googleTokens: {
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      expiryDate: { type: Number, default: null },
    },
    alarmsEnabled: {
      type: Boolean,
      default: false,
    },
    voiceSettings: {
      activationMode: {
        type: String,
        enum: ['always', 'hey_dump', 'manual'],
        default: 'always',
      },
      replyLanguage: {
        type: String,
        enum: ['en', 'auto'],
        default: 'en',
      },
      sttStrategy: {
        type: String,
        enum: ['auto', 'browser', 'whisper'],
        default: 'auto',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'userId',
});

const User = mongoose.model('User', userSchema);
export default User;
