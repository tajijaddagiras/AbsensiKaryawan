'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook untuk debounce value
 * Berguna untuk optimasi search input - mengurangi jumlah filter/search yang dilakukan
 * 
 * @param value - Value yang akan di-debounce
 * @param delay - Delay dalam milliseconds (default: 300ms)
 * @returns Debounced value
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearch = useDebounce(searchQuery, 300);
 * 
 * // searchQuery akan berubah setiap ketikan
 * // debouncedSearch akan berubah setelah 300ms tidak ada perubahan
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timer untuk update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel timer jika value berubah sebelum delay selesai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

