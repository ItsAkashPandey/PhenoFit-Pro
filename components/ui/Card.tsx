import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName = '' }) => {
  return (
    <div className={`shadow-md rounded-lg overflow-hidden border border-panel-border ${className}`}>
      <div className="px-4 py-3 border-b border-panel-border">
        <h3 className={`text-lg font-bold ${titleClassName}`}>{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
};

export default Card;