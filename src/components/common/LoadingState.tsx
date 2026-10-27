import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);
