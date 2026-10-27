import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, ExternalLink, MessageCircle, QrCode, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '../common/Button';

interface ShareLeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFormInApp?: () => void;
}

export const ShareLeadFormModal: React.FC<ShareLeadFormModalProps> = ({
  isOpen,
  onClose,
  onOpenFormInApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?form=interessados`
    : 'https://centaurocf.com.br/?form=interessados';

  const whatsappInvite = `⚽ *Aula Experimental Gratuita — Centauro Centro de Formação (Recife/PE)*\n\nOlá! Venha conhecer nossa estrutura e comissão técnica no Centauro Centro de Formação. A primeira aula do seu filho(a) é 100% gratuita!\n\n👉 Preencha nosso formulário rápido para agendarmos o melhor horário:\n${publicUrl}\n\nTe esperamos em campo!`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(publicUrl, { width: 250, margin: 2 })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [isOpen, publicUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsapp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappInvite)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Link Externo de Inscrição</h3>
              <p className="text-xs text-slate-500">Divulgue no Instagram, WhatsApp e recepção</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Link Direto</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={publicUrl}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-700 select-all"
              />
              <Button size="sm" variant={copied ? 'primary' : 'outline'} onClick={handleCopyLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                <MessageCircle size={16} className="text-emerald-600" />
                <span>Enviar pelo WhatsApp</span>
              </div>
              <p className="text-[11px] text-emerald-800">Mensagem pronta para enviar aos pais e grupos.</p>
              <Button size="sm" variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleShareWhatsapp}>
                Abrir WhatsApp
              </Button>
            </div>

            {onOpenFormInApp && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                  <ExternalLink size={16} className="text-blue-600" />
                  <span>Visualizar Formulário</span>
                </div>
                <p className="text-[11px] text-blue-800">Veja exatamente como o responsável enxerga a página.</p>
                <Button size="sm" variant="primary" className="w-full" onClick={() => { onClose(); onOpenFormInApp(); }}>
                  Abrir Prévia
                </Button>
              </div>
            )}
          </div>

          {qrCodeUrl && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
              <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded border border-slate-300 bg-white p-1" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 block">QR Code para Balcão e Cartazes</span>
                <p className="text-[11px] text-slate-500">Imprima para os pais escanearem diretamente na recepção.</p>
                <a
                  href={qrCodeUrl}
                  download="qrcode-inscricao-centauro.png"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline pt-1"
                >
                  <Download size={13} />
                  <span>Baixar imagem (.png)</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
