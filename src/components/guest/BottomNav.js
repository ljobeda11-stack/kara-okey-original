'use client';

import { Search, ListMusic, Star, User, PartyPopper } from 'lucide-react';

export default function BottomNav({ activeTab, onChangeTab, queueCount = 0 }) {
  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'queue', label: 'Queue', icon: ListMusic, badge: queueCount > 0 ? queueCount : null },
    { id: 'party', label: 'Hype!', icon: PartyPopper },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'profile', label: 'Singer', icon: User },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(10, 10, 26, 0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-glass)',
        padding: '8px 12px calc(8px + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              minWidth: '64px',
              minHeight: '44px',
              color: isActive ? 'var(--neon-purple)' : 'var(--text-dim)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {tab.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'var(--grad-accent)',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                marginTop: '3px',
                letterSpacing: '-0.01em',
              }}
            >
              {tab.label}
            </span>

            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  width: '18px',
                  height: '2px',
                  borderRadius: '2px',
                  background: 'var(--grad-primary)',
                  boxShadow: 'var(--glow-purple)',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
