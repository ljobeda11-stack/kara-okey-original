'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ThumbsUp,
  Mic,
  Disc3,
  Music2,
  GripVertical,
  SkipForward,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';

export default function QueueTab({
  queue = [],
  nowPlaying,
  onVoteSong,
  votedQueueIds = new Set(),
  onReorder,
  onSkip,
  onRemoveSong,
  currentSingerName = '',
  onJoinSong,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const holdTimerRef = useRef(null);
  const endDragGuardRef = useRef(false);

  // Show optimistic local order while parent syncs via SSE
  const visibleQueue = localOrder || queue;

  // Drop stale optimistic order once the server echo arrives
  useEffect(() => {
    setLocalOrder(null);
  }, [queue]);

  useEffect(() => {
    return () => clearTimeout(holdTimerRef.current);
  }, []);

  const startDrag = (index) => setDragIndex(index);

  // Touch: only arm dragging after a 350ms press-and-hold, so normal
  // scrolling / vote taps never accidentally reorder the queue.
  const startTouchHold = (index) => {
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => setDragIndex(index), 350);
  };

  const cancelTouchHold = () => clearTimeout(holdTimerRef.current);

  const moveDrag = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const endDrag = () => {
    if (endDragGuardRef.current) return;
    endDragGuardRef.current = true;
    setTimeout(() => {
      endDragGuardRef.current = false;
    }, 0);
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const next = [...visibleQueue];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dragOverIndex, 0, moved);
      setLocalOrder(next);
      if (onReorder) {
        onReorder(next.map((q) => q.queueId));
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Safety net: releasing the pointer anywhere ends an in-flight drag.
  useEffect(() => {
    if (dragIndex === null) return;
    const stop = () => endDrag();
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    window.addEventListener('touchcancel', stop);
    return () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('touchcancel', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex, dragOverIndex]);

  const cleanCurrentSinger = (currentSingerName || '').trim().toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Currently Playing on Main Stage */}
      {nowPlaying ? (
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            border: '1px solid var(--border-glow)',
            boxShadow: 'var(--glow-purple)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--neon-pink)',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}
          >
            <Disc3 size={14} className="float-animation" />
            <span>Currently on Stage</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={nowPlaying.thumbnail}
              alt={nowPlaying.title}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '2px solid var(--neon-purple)',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {nowPlaying.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {nowPlaying.artist}
              </p>
              <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span className="badge-singer">
                  <Mic size={11} />
                  <span>
                    Singing: {[nowPlaying.singerName, ...(nowPlaying.coSingers || [])].filter(Boolean).join(' & ')}
                  </span>
                </span>
                {nowPlaying.mode && nowPlaying.mode !== 'solo' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: '1px solid var(--neon-cyan)',
                      color: 'var(--neon-cyan)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}
                  >
                    <Users size={10} />
                    <span>{nowPlaying.mode === 'duet' ? 'Duet' : 'Group'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Music2 size={32} color="var(--neon-purple)" style={{ marginBottom: '8px' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No song playing right now</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Go to Search tab and pick a song to be the first singer!
          </p>
        </div>
      )}

      {/* Up Next List */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700 }}>
            Up Next in Queue ({visibleQueue.length})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Drag ⋮⋮ to arrange
            </span>
            {onSkip && nowPlaying && (
              <button
                onClick={onSkip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--grad-accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: 'var(--glow-pink)',
                }}
              >
                <SkipForward size={13} />
                <span>Next / Skip</span>
              </button>
            )}
          </div>
        </div>

        {visibleQueue.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
            }}
          >
            Queue is empty. Queue songs from the Search tab!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleQueue.map((item, index) => {
              const hasVoted = votedQueueIds.has(item.queueId);
              const isDragging = dragIndex === index;
              const isOver = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

              const isOwner =
                cleanCurrentSinger &&
                (item.singerName || '').toLowerCase() === cleanCurrentSinger;

              const coSingers = Array.isArray(item.coSingers) ? item.coSingers : [];
              const isDuetOrGroup = item.mode === 'duet' || item.mode === 'group';
              const maxAllowed = item.maxSingers || (item.mode === 'duet' ? 2 : 4);
              const currentTotalSingers = 1 + coSingers.length;
              const hasOpenSpots = isDuetOrGroup && currentTotalSingers < maxAllowed;

              const alreadyJoined =
                isOwner ||
                coSingers.some((s) => s.toLowerCase() === cleanCurrentSinger);

              return (
                <div
                  key={item.queueId || index}
                  className="glass-card"
                  draggable={false}
                  onTouchMove={(e) => {
                    if (dragIndex === null) {
                      cancelTouchHold();
                      return;
                    }
                    const touch = e.touches[0];
                    const el = document.elementFromPoint(touch.clientX, touch.clientY);
                    const row = el?.closest?.('[data-queue-row]');
                    if (row && row.dataset.index !== undefined) {
                      moveDrag(parseInt(row.dataset.index, 10));
                    }
                  }}
                  onTouchEnd={endDrag}
                  onTouchCancel={endDrag}
                  onMouseEnter={() => moveDrag(index)}
                  onMouseUp={endDrag}
                  onMouseLeave={() => {
                    if (dragIndex !== null) endDrag();
                  }}
                  data-queue-row
                  data-index={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    opacity: isDragging ? 0.55 : 1,
                    border: isOver ? '1px dashed var(--neon-purple)' : undefined,
                    transform: isDragging ? 'scale(0.98)' : 'none',
                    cursor: 'grab',
                    touchAction: isDragging ? 'none' : 'pan-y',
                    userSelect: 'none',
                  }}
                >
                  {/* Drag handle */}
                  <span
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(index);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      startTouchHold(index);
                    }}
                    onTouchEnd={cancelTouchHold}
                    onTouchCancel={cancelTouchHold}
                    style={{
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      cursor: 'grab',
                      padding: '4px 0',
                      touchAction: 'none',
                    }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={18} />
                  </span>

                  {/* Position */}
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: index === 0 ? 'var(--neon-pink)' : 'var(--text-dim)',
                      width: '22px',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    #{index + 1}
                  </span>

                  {/* Thumbnail */}
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.title}
                    </h5>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      <span style={{ color: 'var(--neon-purple)', fontWeight: 600 }}>
                        🎤 {[item.singerName, ...coSingers].filter(Boolean).join(' & ')}
                      </span>
                      <span>•</span>
                      <span>{item.duration}</span>

                      {/* Mode Badge */}
                      {isDuetOrGroup && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(6, 182, 212, 0.15)',
                            border: '1px solid rgba(6, 182, 212, 0.4)',
                            color: 'var(--neon-cyan)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          <Users size={9} />
                          <span>
                            {item.mode === 'duet' ? 'Duet' : 'Group'} ({currentTotalSingers}/{maxAllowed})
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Join Duet / Group Button */}
                    {hasOpenSpots && !alreadyJoined && onJoinSong && (
                      <div style={{ marginTop: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onJoinSong(item.queueId);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(6, 182, 212, 0.2)',
                            border: '1px solid var(--neon-cyan)',
                            color: 'var(--neon-cyan)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)',
                          }}
                        >
                          <UserPlus size={11} />
                          <span>Join {item.mode === 'duet' ? 'Duet' : 'Group'}!</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* Delete button for user's own queued songs */}
                    {isOwner && onRemoveSong && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSong(item.queueId, item.title);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        title="Remove your song from queue"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    {/* Upvote Button */}
                    <button
                      onClick={() => onVoteSong(item.queueId)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: hasVoted
                          ? 'rgba(245, 158, 11, 0.25)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${
                          hasVoted ? 'var(--neon-amber)' : 'var(--border-glass)'
                        }`,
                        color: hasVoted ? 'var(--neon-amber)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Upvote to bump up queue"
                    >
                      <ThumbsUp size={16} fill={hasVoted ? 'var(--neon-amber)' : 'none'} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '2px' }}>
                        {item.votes || 0}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
