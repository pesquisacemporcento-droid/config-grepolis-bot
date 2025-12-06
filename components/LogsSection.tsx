import React from 'react';
import { Terminal } from 'lucide-react';

interface Props {
  logs: string[];
}

const LogsSection: React.FC<Props> = ({ logs }) => {
  return (
    <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00ffae]" />
          Logs do painel / bot
        </h3>
        <span className="text-[11px] text-zinc-500">{logs.length} eventos</span>
      </div>

      <div className="bg-black/60 rounded-lg border border-zinc-800 max-h-64 overflow-auto text-[11px] font-mono text-zinc-300 p-3 space-y-1">
        {logs.length === 0 ? (
          <p className="text-zinc-600">Nenhum evento registrado ainda. As ações do painel aparecerão aqui.</p>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap">
              {line}
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default LogsSection;
