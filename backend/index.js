import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/duellearn';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Basic API route
app.get('/', (req, res) => {
  res.send('DuelLearn API is running...');
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, username: newUser.username }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
    res.json({ token, user: { username: newUser.username, elo: newUser.elo, xp: newUser.xp } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, elo: user.elo, xp: user.xp } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Leaderboard Route
app.get('/api/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find().sort({ elo: -1 }).limit(10).select('-password');
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Matchmaking Queue
let matchmakingQueue = [];
let privateRooms = new Map();
let activeMatches = new Map();

io.on('connection', (socket) => {
  console.log('⚡ A user connected:', socket.id);

  socket.on('create_room', ({ topic, username, elo }) => {
    socket.username = username || 'Guest Account';
    socket.elo = elo || 1000;
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    privateRooms.set(roomCode, {
      creator: socket.id,
      topic,
      username: socket.username,
      elo: socket.elo
    });
    
    socket.emit('room_created', { roomCode });
  });

  socket.on('join_room', ({ roomCode, username, elo }) => {
    socket.username = username || 'Guest Account';
    socket.elo = elo || 1000;
    
    const room = privateRooms.get(roomCode);
    if (!room) {
      return socket.emit('room_error', { message: 'Invalid or expired room code!' });
    }
    
    privateRooms.delete(roomCode);
    const matchId = `match_${Math.random().toString(36).substr(2, 9)}`;
    const topic = room.topic;
    
    activeMatches.set(matchId, {
      player1: room.creator,
      player2: socket.id,
      p1Username: room.username,
      p2Username: socket.username,
      p1Elo: room.elo,
      p2Elo: socket.elo,
      topic,
      score: { [room.creator]: 0, [socket.id]: 0 },
      answers: { [room.creator]: {}, [socket.id]: {} },
      questionCount: 0
    });

    socket.join(matchId);
    io.sockets.sockets.get(room.creator)?.join(matchId);

    io.to(room.creator).emit('match_found', { matchId, opponent: socket.id, opponentName: socket.username, opponentElo: socket.elo });
    io.to(socket.id).emit('match_found', { matchId, opponent: room.creator, opponentName: room.username, opponentElo: room.elo });
    
    import('./services/geminiService.js').then(({ generateQuestionsForTopic }) => {
      const avgElo = Math.round((room.elo + socket.elo) / 2);
      generateQuestionsForTopic(topic, 5, avgElo).then((questions) => {
          const match = activeMatches.get(matchId);
          if(match) {
              match.questions = questions;
              io.to(matchId).emit('game_start', { topic, questions });
          }
      });
    });
  });

  socket.on('join_queue', ({ topic, username, elo }) => {
    socket.username = username || 'Guest Account';
    socket.elo = elo || 1000;
    
    // Basic matchmaking logic
    const opponentIndex = matchmakingQueue.findIndex(p => p.topic === topic && p.socketId !== socket.id);
    
    if (opponentIndex !== -1) {
      const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
      const matchId = `match_${Math.random().toString(36).substr(2, 9)}`;
      
      activeMatches.set(matchId, {
        player1: socket.id,
        player2: opponent.socketId,
        p1Username: socket.username,
        p2Username: opponent.username,
        p1Elo: socket.elo,
        p2Elo: opponent.elo,
        topic,
        score: { [socket.id]: 0, [opponent.socketId]: 0 },
        answers: { [socket.id]: {}, [opponent.socketId]: {} },
        questionCount: 0
      });

      socket.join(matchId);
      io.sockets.sockets.get(opponent.socketId)?.join(matchId);

      io.to(socket.id).emit('match_found', { matchId, opponent: opponent.socketId, opponentName: opponent.username, opponentElo: opponent.elo });
      io.to(opponent.socketId).emit('match_found', { matchId, opponent: socket.id, opponentName: socket.username, opponentElo: socket.elo });
      
      import('./services/geminiService.js').then(({ generateQuestionsForTopic }) => {
        const avgElo = Math.round((socket.elo + opponent.elo) / 2);
        generateQuestionsForTopic(topic, 5, avgElo).then((questions) => {
            const match = activeMatches.get(matchId);
            if(match) {
                match.questions = questions;
                io.to(matchId).emit('game_start', { topic, questions });
            }
        });
      });
      
    } else {
      matchmakingQueue.push({ socketId: socket.id, topic, username: socket.username, elo: socket.elo });
      socket.emit('waiting_in_queue');
      
      // Auto-match against a Duel Bot after 2.5 seconds
      setTimeout(() => {
         const stillInQueue = matchmakingQueue.findIndex(p => p.socketId === socket.id);
         if (stillInQueue !== -1) {
             matchmakingQueue.splice(stillInQueue, 1);
             const matchId = `match_${Math.random().toString(36).substr(2, 9)}`;
             const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
             
             activeMatches.set(matchId, {
                player1: socket.id,
                player2: botId,
                p1Username: socket.username,
                p2Username: 'Duel Bot AI',
                p1Elo: socket.elo,
                p2Elo: 1800,
                topic,
                score: { [socket.id]: 0, [botId]: 0 },
                answers: { [socket.id]: {}, [botId]: {} },
                questionCount: 0,
                isBotMatch: true
             });
             
             socket.join(matchId);
             io.to(socket.id).emit('match_found', { matchId, opponent: botId, opponentName: 'Duel Bot AI', opponentElo: 1800 });
             
             import('./services/geminiService.js').then(({ generateQuestionsForTopic }) => {
                const avgElo = Math.round((socket.elo + 1800) / 2);
                generateQuestionsForTopic(topic, 5, avgElo).then((questions) => {
                    const match = activeMatches.get(matchId);
                    if(match) {
                        match.questions = questions;
                        io.to(matchId).emit('game_start', { topic, questions });
                    }
                });
             });
         }
      }, 2500);
    }
  });

  socket.on('submit_answer', (data) => {
    const { matchId, questionIndex, answer, isCorrect } = data;
    const match = activeMatches.get(matchId);
    if (!match) return;

    match.answers[socket.id][questionIndex] = isCorrect;
    socket.to(matchId).emit('opponent_answered');

    const opponentId = socket.id === match.player1 ? match.player2 : match.player1;
    
    if (match.isBotMatch) {
       // Simulate Bot answering (50% correctness rate)
       match.answers[opponentId][questionIndex] = Math.random() > 0.5;
       socket.emit('opponent_answered');
    }

    const myAnswer = match.answers[socket.id][questionIndex];
    const opAnswer = match.answers[opponentId][questionIndex];

    if (myAnswer !== undefined && opAnswer !== undefined) {
      // Both answered, calc score
      if (myAnswer) match.score[socket.id] += 10;
      if (opAnswer) match.score[opponentId] += 10;

      io.to(matchId).emit('round_result', {
         player1: { id: match.player1, score: match.score[match.player1] },
         player2: { id: match.player2, score: match.score[match.player2] }
      });

      // Check for match over
      if (match.questions && 
          Object.keys(match.answers[match.player1]).length === match.questions.length &&
          Object.keys(match.answers[match.player2]).length === match.questions.length) {
          
          const p1Score = match.score[match.player1];
          const p2Score = match.score[match.player2];
          const isTie = p1Score === p2Score;

          const updateElo = async (username, didWin) => {
              if(!username || username === 'Guest Account') return;
              try {
                  const user = await User.findOne({ username });
                  if (!user) return;

                  let currentStreak = user.currentStreak || 0;
                  let newStreak = didWin ? (isTie ? currentStreak : currentStreak + 1) : 0;
                  let highestStreak = Math.max(user.highestStreak || 0, newStreak);

                  // 1.5x Multiplier if streak >= 3
                  const multiplier = newStreak >= 3 ? 1.5 : 1;

                  const eloChange = isTie ? 5 : (didWin ? 25 : -15);
                  const baseXp = isTie ? 10 : (didWin ? 50 : 10);
                  const xpChange = Math.round(baseXp * multiplier);

                  await User.findOneAndUpdate(
                      { username },
                      { 
                          $inc: { elo: eloChange, xp: xpChange, gamesPlayed: 1, ...(didWin && !isTie && {gamesWon: 1}) },
                          $set: { currentStreak: newStreak, highestStreak: highestStreak }
                      }
                  );
              } catch (e) { console.error('Error updating player stats:', e); }
          };

          updateElo(match.p1Username, p1Score > p2Score);
          updateElo(match.p2Username, p2Score > p1Score);

          io.to(matchId).emit('match_over', { p1Score, p2Score });
          activeMatches.delete(matchId);
      }
    }
  });

  socket.on('disconnect', () => {
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
    console.log('🔌 User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
