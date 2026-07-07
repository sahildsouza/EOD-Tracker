import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Loader.module.css';

export default function Loader({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className={styles.container}>
      <Loader2 size={36} className={styles.spinner} />
      <span className={styles.message}>{message}</span>
    </div>
  );
}
