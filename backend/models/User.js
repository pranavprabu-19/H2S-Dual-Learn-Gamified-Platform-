import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  elo: {
    type: Number,
    default: 1200 // Default starting ELO
  },
  xp: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  highestStreak: {
    type: Number,
    default: 0
  },
  topicStats: {
    type: Map,
    of: new mongoose.Schema({
      played: { type: Number, default: 0 },
      won: { type: Number, default: 0 }
    }, { _id: false }),
    default: {}
  }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
