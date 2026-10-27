import React from 'react';

interface ModulePlaceholderProps {
  title?: string;
  description?: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title = 'Módulo em Desenvolvimento',
  description = 'Esta funcionalidade está sendo implementada.',
}) => {
  return (
    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
};
