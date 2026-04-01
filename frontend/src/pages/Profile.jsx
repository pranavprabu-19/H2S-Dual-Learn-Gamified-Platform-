import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Trophy, BarChart2, Target, ArrowLeft } from 'lucide-react';
import { getRankDetails } from '../utils/ranks';
import { playSound } from '../utils/audio';
import './profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    fetch('http://localhost:5000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setProfile(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      navigate('/auth');
    });
  }, [navigate]);

  if (loading) {
     return <div className="container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>Loading Profile...</div>;
  }

  const rank = getRankDetails(profile.elo);
  const winRate = profile.gamesPlayed > 0 
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) 
    : 0;

  // Let's create an XP progress calculation (e.g. 500 XP per level)
  const xpLevel = Math.floor(profile.xp / 500);
  const xpProgress = profile.xp % 500;
  const xpPercent = (xpProgress / 500) * 100;

  const handleBack = () => {
    playSound('click');
    navigate('/');
  }

  return (
    <div className="container profile-container">
      <div>
        <button className="glass-panel lb-back" onClick={handleBack} style={{marginBottom: '1rem', background: 'none', border:'none', color:'var(--text-muted)', cursor:'pointer', display:'flex', gap:'0.5rem', alignItems:'center'}}>
            <ArrowLeft size={20} /> Back to Arena
        </button>
      </div>

      <div className="profile-header glass-panel">
        <div className="avatar-placeholder" style={{ borderColor: rank.color }}>
          <User size={64} color={rank.color} />
        </div>
        <div className="profile-info">
          <h1>{profile.username}</h1>
          <h3 style={{color: rank.color, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1rem'}}>{rank.title}</h3>
        </div>
        <div className="profile-elo glass-panel">
          <h2>{profile.elo}</h2>
          <span>ELO Rating</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card">
           <Trophy size={32} className="stat-icon" color="#ffd700" />
           <h3>{profile.gamesWon || 0}</h3>
           <span>Victories</span>
        </div>
        <div className="glass-panel stat-card">
           <BarChart2 size={32} className="stat-icon" color="#00d2ff" />
           <h3>{profile.gamesPlayed || 0}</h3>
           <span>Matches Played</span>
        </div>
        <div className="glass-panel stat-card">
           <Target size={32} className="stat-icon" color="#ff4757" />
           <h3>{winRate}%</h3>
           <span>Win Rate</span>
        </div>
      </div>

      <div className="glass-panel progression-card">
        <div className="progression-header">
           <h2>Level {xpLevel}</h2>
           <span>{xpProgress} / 500 XP to next level</span>
        </div>
        <div className="xp-bar-bg">
           <div className="xp-bar-fill" style={{ width: `${xpPercent}%`, background: rank.color }}></div>
        </div>
      </div>
    </div>
  );
}
