'use client';

import { useState, useEffect } from 'react';
import { User, Check, Mic, Music, Sparkles, Trophy, Award, Heart } from 'lucide-react';
import MascotImage from '@/components/shared/MascotImage';

export default function ProfileTab({
  singerName,
  onSaveSingerName,
  queuedHistory = [],
  roomCode,
}) {
  const [nameInput, setNameInput] = useState(singerName || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [stats, setStats] = useState({ songsSung: 0, cheersReceived: 0, rank: null, score: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!roomCode || !singerName) return;
    let cancel = false;
    async function loadStats() {
      setLoadingStats(true);
      try {
        const res = await fetch(`/api/room/${roomCode}/stats`);
        const data = await res.json();
        if (cancel) return;
        if (data.success && Array.isArray(data.leaderboard)) {
          const index = data.leaderboard.findIndex(
            (s) => (s.singerName || '').toLowerCase() === (singerName || '').toLowerCase()
          );
          if (index >= 0) {
            const myStat = data.leaderboard[index];
            setStats({
              songsSung: myStat.songsSung || 0,
              cheersReceived: myStat.cheersReceived || 0,
              rank: index + 1,
              score: myStat.score || 0,
            });
          }
        }
      } catch (err) {}
      finally {
        if (!cancel) setLoadingStats(false);
      }
    }
    loadStats();
    return () => {
      cancel = true;
    };
  }, [roomCode, singerName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onSaveSingerName(nameInput.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Profile Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <MascotImage size="md" />

        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 800,
            marginTop: '12px',
          }}
        >
          {singerName || 'Guest Singer'}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          This name appears on the TV screen when your song plays!
        </p>

        {/* Change Name Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: '340px',
            marginTop: '16px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your stage name..."
            maxLength={20}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            {savedSuccess ? <Check size={16} /> : 'Save'}
          </button>
        </form>
      </div>

      {/* Tonight's Performer Stats */}
      <div
        className="glass-panel"
        style={{
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} color="var(--neon-amber)" />
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700 }}>
            Tonight's Singer Stats
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {/* Songs Sung */}
          <div
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              textAlign: 'center',
            }}
          >
            <Mic size={16} color="var(--neon-purple)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              {stats.songsSung}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Songs Sung</div>
          </div>

          {/* Cheers Received */}
          <div
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              textAlign: 'center',
            }}
          >
            <Heart size={16} color="var(--neon-pink)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              {stats.cheersReceived}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cheers</div>
          </div>

          {/* Leaderboard Rank */}
          <div
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              textAlign: 'center',
            }}
          >
            <Award size={16} color="var(--neon-cyan)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: stats.rank ? 'var(--neon-cyan)' : 'var(--text-dim)' }}>
              {stats.rank ? `#${stats.rank}` : '—'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Room Rank</div>
          </div>
        </div>
      </div>

      {/* Your Queued Songs History in this room */}
      <div>
        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>
          Your Queued Songs ({queuedHistory.length})
        </h4>

        {queuedHistory.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
            }}
          >
            You haven't queued any songs yet!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queuedHistory.map((song, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                }}
              >
                <Music size={16} color="var(--neon-purple)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {song.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
