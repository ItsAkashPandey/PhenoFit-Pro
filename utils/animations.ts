export const animate = (
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: number | KeyframeAnimationOptions
) => {
    const animation = element.animate(keyframes, options);
    return animation;
};

export const slideIn = (element: HTMLElement) => {
    return animate(
        element,
        [
            { transform: 'translateY(10px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 }
        ],
        {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        }
    );
};

export const slideOut = (element: HTMLElement) => {
    return animate(
        element,
        [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(10px)', opacity: 0 }
        ],
        {
            duration: 200,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        }
    );
};

export const fadeIn = (element: HTMLElement) => {
    return animate(
        element,
        [
            { opacity: 0 },
            { opacity: 1 }
        ],
        {
            duration: 200,
            easing: 'ease-in-out',
            fill: 'forwards'
        }
    );
};

export const fadeOut = (element: HTMLElement) => {
    return animate(
        element,
        [
            { opacity: 1 },
            { opacity: 0 }
        ],
        {
            duration: 150,
            easing: 'ease-in-out',
            fill: 'forwards'
        }
    );
};

export const scaleIn = (element: HTMLElement) => {
    return animate(
        element,
        [
            { transform: 'scale(0.95)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 }
        ],
        {
            duration: 200,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        }
    );
};

export const shake = (element: HTMLElement) => {
    return animate(
        element,
        [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(5px)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(0)' }
        ],
        {
            duration: 500,
            easing: 'ease-in-out'
        }
    );
};
