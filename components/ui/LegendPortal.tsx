import React from 'react';
import { createPortal } from 'react-dom';

interface LegendPortalProps {
    children: React.ReactNode;
}

const LegendPortal: React.FC<LegendPortalProps> = ({ children }) => {
    const [portalContainer] = React.useState(() => {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.zIndex = '1000';
        div.style.pointerEvents = 'none';
        return div;
    });

    React.useEffect(() => {
        document.body.appendChild(portalContainer);
        return () => {
            document.body.removeChild(portalContainer);
        };
    }, [portalContainer]);

    return createPortal(
        <div style={{ pointerEvents: 'auto' }}>
            {children}
        </div>,
        portalContainer
    );
};

export default LegendPortal;
