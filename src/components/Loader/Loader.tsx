import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem', gap: '1rem', width: '100%', minHeight: '220px' }}>
      <Loader2 size={36} style={{ color: 'var(--accent-color)', animation: 'spin 1s linear infinite' }} />
      <span className="text-secondary" style={{ fontSize: '0.925rem', fontWeight: 500, letterSpacing: '0.3px' }}>{message}</span>
    </div>
  );
}
