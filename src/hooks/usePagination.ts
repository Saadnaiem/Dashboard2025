import { useState, useMemo } from 'react';

/**
 * A custom hook that paginates an array of data.
 * @param data The array of data to paginate.
 * @param itemsPerPage The number of items to display per page.
 * @returns An object containing pagination state and helper functions.
 */
export function usePagination<T>(data: T[], itemsPerPage: number) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = useMemo(() => {
        if (itemsPerPage <= 0) return 1;
        return Math.ceil(data.length / itemsPerPage);
    }, [data.length, itemsPerPage]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    }, [data, currentPage, itemsPerPage]);

    const nextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const prevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const canGoNext = currentPage < totalPages;
    const canGoPrev = currentPage > 1;

    // Reset to page 1 if data changes and current page becomes invalid
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    }

    return {
        currentPage,
        totalPages,
        paginatedData,
        nextPage,
        prevPage,
        canGoNext,
        canGoPrev,
    };
}
