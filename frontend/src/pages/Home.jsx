import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, Sparkles, Brain, Shield } from 'lucide-react';
import { socket } from '../socket';
import { playSound } from '../utils/audio';
import './home.css';

const MOCK_TOPICS = [
  { id: 'math', name: 'Mathematics', icon: Brain },
  { id: 'history', name: 'World History', icon: Trophy },
  { id: 'science', name: 'General Science', icon: Sparkles }
];

export default function Home() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState(null);
  
  const [roomMode, setRoomMode] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState(null);
  const [roomError, setRoomError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    socket.on('waiting_in_queue', () => {
      setIsSearching(true);
    });

    socket.on('match_found', (data) => {
      setIsSearching(false);
      setRoomMode(false);
      // View transition API for smooth navigation if supported
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate('/arena', { state: { matchId: data.matchId, topic: selectedTopic || data.topic, opponentName: data.opponentName, opponentElo: data.opponentElo } });
        });
      } else {
        navigate('/arena', { state: { matchId: data.matchId, topic: selectedTopic || data.topic, opponentName: data.opponentName, opponentElo: data.opponentElo } });
      }
    });

    socket.on('room_created', ({ roomCode }) => {
      setCreatedRoomCode(roomCode);
    });

    socket.on('room_error', ({ message }) => {
      setRoomError(message);
    });

    return () => {
      socket.off('waiting_in_queue');
      socket.off('match_found');
      socket.off('room_created');
      socket.off('room_error');
    };
  }, [navigate, selectedTopic]);

  const handleBattle = () => {
    if (!selectedTopic || !user) return;
    socket.emit('join_queue', { topic: selectedTopic, username: user.username, elo: user.elo });
  };

  const handleCreateRoom = () => {
    if (!selectedTopic || !user) return;
    playSound('click');
    setRoomMode('create');
    socket.emit('create_room', { topic: selectedTopic, username: user.username, elo: user.elo });
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput || !user) return;
    playSound('click');
    socket.emit('join_room', { roomCode: roomCodeInput, username: user.username, elo: user.elo });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="container home-container">
      <header className="hero">
        <div className="logo-container">
          <h1 className="logo-text">Duel<span className="accent">Learn</span></h1>
          <p className="subtitle">Compete. Learn. Conquer.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <div className="glass-panel" style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={() => { playSound('click'); navigate('/profile'); }} title="View Profile">
              <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{user.username}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.elo} ELO</span>
            </div>
          ) : null}
          <button className="glass-panel leaderboard-btn" onClick={() => { playSound('click'); navigate('/leaderboard'); }}>
            <Trophy size={18} />
            <span>Leaderboards</span>
          </button>
        </div>
      </header>

      <main className="content-area">
        <section className="glass-panel selection-card">
          <h2>Choose Your Battlefield</h2>
          
          <div className="topic-grid">
            {MOCK_TOPICS.map(topic => (
              <div 
                key={topic.id} 
                className={`topic-card ${selectedTopic === topic.name ? 'selected' : ''}`}
                onClick={() => { playSound('click'); setSelectedTopic(topic.name); }}
              >
                <topic.icon className="topic-icon" />
                <span>{topic.name}</span>
              </div>
            ))}
          </div>

          <div style={{marginTop:'1.5rem'}}>
            <input 
              type="text" 
              placeholder="Or type any custom topic (e.g. Black Holes)..." 
              value={selectedTopic && !MOCK_TOPICS.find(t => t.name === selectedTopic) ? selectedTopic : ''}
              onChange={(e) => setSelectedTopic(e.target.value)}
              onClick={() => { if(!selectedTopic || MOCK_TOPICS.find(t => t.name === selectedTopic)) setSelectedTopic(''); }}
              style={{
                width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', 
                border: `2px solid ${selectedTopic && !MOCK_TOPICS.find(t => t.name === selectedTopic) ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, 
                borderRadius: '12px', color: 'white', fontSize: '1.1rem', textAlign: 'center'
              }}
            />
          </div>

            <div className="action-area">
            {isSearching ? (
              <div className="searching-state">
                <div className="pulse-ring"></div>
                <p>Searching for Opponent...</p>
              </div>
            ) : !user ? (
              <button 
                className="btn-primary battle-btn" 
                onClick={() => { playSound('click'); navigate('/auth'); }}
              >
                <Shield size={20} />
                <span>Login to Battle</span>
              </button>
            ) : roomMode === 'create' ? (
                <div className="room-state" style={{textAlign:'center'}}>
                   <h3 style={{color:'var(--text-muted)'}}>Room Created</h3>
                   <div style={{fontSize:'3rem', letterSpacing:'6px', fontWeight:'900', margin:'1.5rem 0', color:'var(--primary)', textShadow:'0 0 20px rgba(0,210,255,0.4)'}}>{createdRoomCode || '...'}</div>
                   <p style={{marginBottom:'1rem'}}>Waiting for opponent to join...</p>
                   <button className="btn-secondary" onClick={() => { playSound('click'); setRoomMode(false); }}>Cancel</button>
                </div>
            ) : roomMode === 'join' ? (
                <div className="room-state" style={{display:'flex', flexDirection:'column', gap:'1rem', alignItems:'center'}}>
                   <h3 style={{color:'var(--text-muted)'}}>Join Private Room</h3>
                   <input type="text" placeholder="Enter 6-Digit Code" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} maxLength={6} style={{padding:'1rem', fontSize:'1.5rem', textAlign:'center', textTransform:'uppercase', background:'rgba(255,255,255,0.05)', border:'2px solid var(--primary)', color:'white', borderRadius:'12px', width:'100%', maxWidth:'300px'}} />
                   {roomError && <p style={{color:'#ff4757', fontWeight:'bold'}}>{roomError}</p>}
                   <div style={{display:'flex', gap:'1rem', width:'100%'}}>
                       <button className="btn-primary" style={{flex:1}} onClick={handleJoinRoom} disabled={roomCodeInput.length !== 6}>Join Game</button>
                       <button className="btn-secondary" style={{flex:1}} onClick={() => { playSound('click'); setRoomMode(false); setRoomError(''); }}>Cancel</button>
                   </div>
                </div>
            ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'1rem', width:'100%'}}>
                  <button 
                    className="btn-primary battle-btn" 
                    onClick={() => { playSound('click'); handleBattle(); }}
                    disabled={!selectedTopic}
                  >
                    <Swords size={20} />
                    <span>Enter Public Arena</span>
                  </button>
                  <div style={{display:'flex', gap:'1rem', width:'100%'}}>
                      <button className="btn-secondary" style={{flex:1, padding:'1rem', background:'rgba(255,255,255,0.05)', borderRadius:'12px', color:'white', border:'1px solid rgba(255,255,255,0.1)'}} disabled={!selectedTopic} onClick={handleCreateRoom}>Create Room</button>
                      <button className="btn-secondary" style={{flex:1, padding:'1rem', background:'rgba(255,255,255,0.05)', borderRadius:'12px', color:'white', border:'1px solid rgba(255,255,255,0.1)'}} onClick={() => { playSound('click'); setRoomMode('join'); }}>Join Room</button>
                  </div>
                </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
