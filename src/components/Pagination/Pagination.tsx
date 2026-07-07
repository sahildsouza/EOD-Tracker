import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  if (totalItems === 0) return null;

  return (
    <div className={styles.container}>
      <span className={styles.summary}>
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
      </span>
      <div className={styles.controls}>
        <button 
          className={`btn-outline ${styles.pageBtn}`}
          disabled={currentPage === 1} 
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={15} /> Prev
        </button>
        <span className={styles.pageInfo}>
          {currentPage} of {totalPages}
        </span>
        <button 
          className={`btn-outline ${styles.pageBtn}`}
          disabled={currentPage === totalPages} 
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
