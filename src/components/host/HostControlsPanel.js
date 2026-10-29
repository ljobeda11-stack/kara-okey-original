'use client';

import { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Trash2,
  Settings,
  X,
  Users,
  Shield,
  Check,
  AlertCircle,
  ListMusic,
  UserCheck,
} from 'lucide-react';

export default function HostControlsPanel({
  roomCode,
  queue = [],
  guestCount = 1,
  isOpen,
  onClose,
  onRefreshQueue,
}) {
  const [locked, setLocked] = useState(false);
  const [maxPerGuest, setMaxPerGuest] = useState(0);
  const [rotationMode, setRotationMode] = useState('off');
  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [newPin, setNewPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !roomCode) return;
    async function loadStatus() {
      try {
        const res = await fetch(`/api/room/${roomCode}/controls`);
        const data = await res.json();
        if (data.success) {
          setLocked(data.locked);
          setMaxPerGuest(data.maxPerGuest || 0);
          setRotationMode(data.rotationMode || 'off');
          setHasPin(data.hasPin);
          if (data.hasPin) {
            setIsUnlocked(false);
          } else {
            setIsUnlocked(true);
          }
        }
      } catch (err) {}
    }
    loadStatus();
  }, [isOpen, roomCode]);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleVerifyPin = async (e) => {
    e?.preventDefault();
    if (!pinInput.trim()) return;
    try {
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', pin: pinInput }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsUnlocked(true);
        notify('Host PIN verified!');
      } else {
        notify('Incorrect PIN!');
      }
    } catch (err) {
      notify('Error verifying PIN');
    }
  };

  const handleToggleLock = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_lock',
          locked: !locked,
          pin: pinInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLocked(data.locked);
        notify(data.locked ? 'Queue is now LOCKED' : 'Queue is now UNLOCKED');
      }
    } catch (err) {
      notify('Failed to update queue lock');
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('Are you sure you want to clear the entire queue?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_queue', pin: pinInput }),
      });
      const data = await res.json();
      if (data.success) {
        notify('Queue cleared!');
        if (onRefreshQueue) onRefreshQueue();
      }
    } catch (err) {
      notify('Failed to clear queue');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSong = async (queueId, title) => {
    try {
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_song',
          queueId,
          pin: pinInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`Removed "${title}"`);
        if (onRefreshQueue) onRefreshQueue();
      }
    } catch (err) {
      notify('Failed to remove song');
    }
  };

  const handleSetMax = async (limit) => {
    try {
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_max_per_guest',
          maxPerGuest: limit,
          pin: pinInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMaxPerGuest(limit);
        notify(limit === 0 ? 'Queue limit: Unlimited' : `Queue limit: ${limit} per guest`);
      }
    } catch (err) {
      notify('Failed to update limit');
    }
  };

  const handleToggleRotation = async () => {
    setLoading(true);
    try {
      const newMode = rotationMode === 'off' ? 'fair' : 'off';
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_rotation',
          mode: newMode,
          pin: pinInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRotationMode(data.rotationMode);
        notify(data.rotationMode === 'fair' ? 'Fair rotation enabled!' : 'Fair rotation disabled');
      }
    } catch (err) {
      notify('Failed to toggle rotation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/room/${roomCode}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_pin',
          newPin: newPin.trim(),
          pin: pinInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasPin(!!newPin.trim());
        setPinInput(newPin.trim());
        setShowPinSetup(false);
        setNewPin('');
        notify(newPin.trim() ? 'Host PIN saved!' : 'Host PIN removed');
      }
    } catch (err) {
      notify('Failed to set PIN');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 5, 16, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 17, 38, 0.95)',
          border: '1px solid var(--border-glow)',
          boxShadow: 'var(--glow-purple), 0 20px 60px rgba(0,0,0,0.8)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-glass)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid var(--neon-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={20} color="var(--neon-purple)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Host Admin Controls
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Room <strong style={{ color: 'var(--neon-purple)' }}>{roomCode}</strong> • {guestCount} connected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(168, 85, 247, 0.25)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              textAlign: 'center',
              borderBottom: '1px solid var(--border-glow)',
            }}
          >
            {feedback}
          </div>
        )}

        {/* Locked by PIN check */}
        {!isUnlocked ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <Shield size={44} color="var(--neon-amber)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Host PIN Required</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
              This room is protected by a host administrator PIN.
            </p>
            <form onSubmit={handleVerifyPin} style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN"
                autoFocus
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '1rem',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  outline: 'none',
                  width: '180px',
                }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
                Unlock
              </button>
            </form>
          </div>
        ) : (
          /* Controls Content */
          <div
            style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Action Bar: Lock & Clear */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={handleToggleLock}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: locked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                  border: `1px solid ${locked ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
                  color: locked ? '#fca5a5' : '#86efac',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {locked ? <Lock size={16} /> : <Unlock size={16} />}
                <span>{locked ? 'Queue Locked' : 'Queue Open'}</span>
              </button>

              <button
                onClick={handleClearQueue}
                disabled={loading || queue.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  color: 'var(--neon-rose)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: queue.length === 0 ? 'default' : 'pointer',
                  opacity: queue.length === 0 ? 0.45 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <Trash2 size={16} />
                <span>Clear All ({queue.length})</span>
              </button>
            </div>

            {/* Fair Singer Rotation */}
            <div
              className="glass-card"
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                  <Users size={16} color="var(--neon-purple)" />
                  <span>Fair Singer Rotation</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: rotationMode === 'fair' ? 'var(--neon-purple)' : 'var(--text-muted)' }}>
                  {rotationMode === 'fair' ? 'ON' : 'OFF'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 12px 0' }}>
                Alternates singers so everyone gets a turn. Votes still rank songs within each singer.
              </p>
              <button
                onClick={handleToggleRotation}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: rotationMode === 'fair' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${rotationMode === 'fair' ? 'rgba(168, 85, 247, 0.5)' : 'var(--border-glass)'}`,
                  color: rotationMode === 'fair' ? '#c084fc' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {rotationMode === 'fair' ? 'Disable Rotation' : 'Enable Fair Rotation'}
              </button>
            </div>

            {/* Song Limits Per Guest */}
            <div
              className="glass-card"
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                  <UserCheck size={16} color="var(--neon-cyan)" />
                  <span>Max Songs Per Singer in Queue</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {maxPerGuest === 0 ? 'Unlimited' : `${maxPerGuest} songs`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0, 1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSetMax(val)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 'var(--radius-sm)',
                      background: maxPerGuest === val ? 'var(--grad-primary)' : 'rgba(255,255,255,0.05)',
                      border: maxPerGuest === val ? 'none' : '1px solid var(--border-glass)',
                      color: maxPerGuest === val ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {val === 0 ? '∞ All' : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Queue Songs Management */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700 }}>
                  <ListMusic size={16} color="var(--neon-purple)" />
                  <span>Queue Control ({queue.length})</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Host can remove any track
                </span>
              </div>

              {queue.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '0.85rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  No songs in queue.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {queue.map((item, idx) => (
                    <div
                      key={item.queueId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-sm)',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--neon-pink)', fontWeight: 800, width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          🎤 {item.singerName || 'Guest'} • {item.votes || 0} votes
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveSong(item.queueId, item.title)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PIN Settings */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              {!showPinSetup ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {hasPin ? '🔒 Admin PIN is active' : '🔓 No Admin PIN set (anyone with host view can control)'}
                  </div>
                  <button
                    onClick={() => setShowPinSetup(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--neon-purple)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {hasPin ? 'Change PIN' : 'Set Host PIN'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveNewPin} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New 4-digit PIN (leave empty to clear)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-glass)',
                      color: '#fff',
                      fontSize: '0.82rem',
                    }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPinSetup(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
