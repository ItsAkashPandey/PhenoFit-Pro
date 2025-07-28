import { useRef, useEffect } from 'react';

export const useLoadingState = (duration: number = 500) => {
    const loadingTimer = useRef<NodeJS.Timeout | null>(null);
    const isLoading = useRef(false);

    const startLoading = () => {
        isLoading.current = true;
        return new Promise<void>((resolve) => {
            loadingTimer.current = setTimeout(() => {
                isLoading.current = false;
                resolve();
            }, duration);
        });
    };

    const stopLoading = () => {
        if (loadingTimer.current) {
            clearTimeout(loadingTimer.current);
        }
        isLoading.current = false;
    };

    useEffect(() => {
        return () => {
            stopLoading();
        };
    }, []);

    return {
        isLoading: () => isLoading.current,
        startLoading,
        stopLoading
    };
};

export const useDebounce = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): ((...funcArgs: Parameters<T>) => void) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const debouncedCallback = (...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
};
