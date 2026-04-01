import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import './leaderboard.css';

export default function Leaderboard() {
  const navigate = useNavigate();

  const [leaders, setLeaders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetch('http://localhost:5000/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaders(data))
      .catch(console.error);
  }, []);

  return (
    <div className="container lb-container">
      <div className="lb-header">
        <button className="glass-panel lb-back" onClick={() => navigate('/')}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Global <span className="accent">Leaderboard</span></h1>
        <div style={{width: 100}}></div>
      </div>

      <div className="glass-panel lb-card">
        <div className="lb-list">
          {leaders.map((p, index) => (
            <div key={p._id} className={`lb-row ${currentUser?.username === p.username ? 'highlight' : ''}`}>
              <div className="rank">
                {index + 1 === 1 ? <Trophy color="#ffd700"/> : index + 1}
              </div>
              <div className="name">{p.username}</div>
              <div className="elo">{p.elo} ELO</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
