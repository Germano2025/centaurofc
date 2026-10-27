import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onImport?: (data: any[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  title = 'Importar Dados via Planilha CSV',
}) => {
  const [success, setSuccess] = useState(false);

  const handleSimulate = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-center py-4">
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-400 transition-colors bg-slate-50 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <UploadCloud size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Selecione ou arraste seu arquivo CSV</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Formato aceito: .csv (máx 5MB)</p>
          </div>
          <input type="file" accept=".csv" className="hidden" id="csv-upload" />
          <label
            htmlFor="csv-upload"
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Escolher Arquivo
          </label>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-center gap-2 font-bold">
            <CheckCircle2 size={16} />
            <span>Dados importados com sucesso!</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSimulate}>
            Processar Importação
          </Button>
        </div>
      </div>
    </Modal>
  );
};
