import React, { useState } from 'react';
import { 
  Bot, 
  Leaf, 
  Truck, 
  Clock, 
  Activity, 
  Shield, 
  Hammer, 
  Sword, 
  School,
  Target,
  Save,
  Loader2,
  User,
  RefreshCw,
  PlusCircle,
  Terminal,
  List,
  ChevronRight
} from 'lucide-react';
import { Card, Toggle, Input, Checkbox, StatusBadge } from './UI';
import { RootConfig, KnownAccount } from '../types';

// Constants for styling
const INNER_CARD_BG = 'bg-zinc-950/50';
const INNER_BORDER = 'border-zinc-800/50';

// --- Helper Functions ---
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
};

// --- Helper for Save Button ---
interface SaveActionProps {
  onSave: () => void;
  isSaving: boolean;
}

const SaveAction: React.FC<SaveActionProps> = ({ onSave, isSaving }) => (
  <button
    onClick={onSave}
    disabled={isSaving}
    className={`
      ml-3 p-2 rounded-lg border transition-all duration-200 active:scale-95
      ${isSaving 
        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 cursor-wait' 
        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-700/50'
      }
    `}
    title="Salvar configuração"
  >
    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
  </button>
);

// --- Logs Section ---
interface LogsSectionProps {
  logs: string[];
}

export const LogsSection: React.FC<LogsSectionProps> = ({ logs }) => {
  return (
    <Card icon={Terminal} title="Terminal / Logs">
      <div className={`w-full h-48 overflow-y-auto custom-scrollbar font-mono text-[11px] p-4 rounded-xl border ${INNER_BORDER} bg-[#09090b] text-zinc-400 leading-relaxed shadow-inner`}>
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
            <Terminal className="w-8 h-8 mb-2" />
            <span>Aguardando eventos...</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="border-b border-zinc-800/30 last:border-0 pb-1 mb-1 hover:bg-zinc-900/50 transition-colors px-1 rounded">
              <span className="text-[#00ffae] mr-2 opacity-60 font-bold">{log.split(']')[0]}]</span>
              <span className={log.toLowerCase().includes('erro') ? 'text-red-400' : 'text-zinc-300'}>
                {log.split(']').slice(1).join(']')}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

// --- Quick View Section ---
interface QuickViewProps {
  accounts: KnownAccount[];
  onSelect: (account: string) => void;
  currentAccount: string;
}

export const QuickView: React.FC<QuickViewProps> = ({ accounts, onSelect, currentAccount }) => {
  return (
    <div className="w-full bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 h-auto overflow-visible">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <List className="w-4 h-4 text-[#00ffae]" />
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Contas</h2>
        </div>
        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-700">
          {accounts.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        {accounts.length === 0 ? (
          <div className="text-zinc-600 text-sm italic text-center py-8 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            Nenhuma conta encontrada.
          </div>
        ) : (
          accounts.map((acc) => {
            const isActive = acc.account === currentAccount;
            return (
              <button
                key={acc.account}
                onClick={() => onSelect(acc.account)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-zinc-800/80 border-[#00ffae]/40 shadow-[0_0_15px_-10px_#00ffae]' 
                    : 'bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium truncate max-w-[70%] ${isActive ? 'text-[#00ffae]' : 'text-zinc-300 group-hover:text-white'}`}>
                    {acc.account}
                  </span>
                  {isActive && <ChevronRight className="w-4 h-4 text-[#00ffae]" />}
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-2">
                   <div className="flex gap-2">
                      <span className={`flex items-center gap-1.5 ${acc.online ? 'text-green-400' : 'text-zinc-600'}`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${acc.online ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`} />
                         {acc.online ? 'ON' : 'OFF'}
                      </span>
                      {acc.intervalMin && (
                         <span className="text-zinc-600 border-l border-zinc-800 pl-2">
                           {acc.intervalMin}-{acc.intervalMax}s
                         </span>
                      )}
                   </div>
                   {acc.updatedAt && (
                      <span className="opacity-50">{formatDate(acc.updatedAt).split(' ')[0]}</span>
                   )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- Account Section ---
interface AccountSectionProps {
  accountKey: string;
  setAccountKey: (key: string) => void;
  isFetching: boolean;
  knownAccounts: KnownAccount[];
  onCreateNew: (name: string) => void;
  onReloadAccounts: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ 
  accountKey, 
  setAccountKey, 
  isFetching,
  knownAccounts,
  onCreateNew,
  onReloadAccounts
}) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (newAccountName) {
      onCreateNew(newAccountName);
      setNewAccountName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Conta Atual
        </h2>
        <button 
          onClick={onReloadAccounts}
          className="text-[10px] flex items-center gap-1.5 text-[#00ffae] hover:text-[#00ffae]/80 bg-zinc-900/50 px-2.5 py-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 transition-all hover:bg-zinc-900"
          title="Recarregar lista de contas"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

      <div className="space-y-4">
        {/* Manual Input */}
        <div className="relative group">
          <Input 
            id="account" 
            label="ID da Conta (Auto-detectado ou Manual)"
            placeholder="mundo_nick, ex: br14_NOME"
            value={accountKey}
            onChange={(e) => setAccountKey(e.target.value)}
            className="font-mono text-[#00ffae] pr-10 tracking-wide font-medium"
          />
          <div className="absolute right-3 top-[34px] text-zinc-500">
             {isFetching && <Loader2 className="w-4 h-4 animate-spin text-[#00ffae]" />}
          </div>
        </div>

        {/* Create New Area */}
        {!isCreating ? (
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full py-2.5 text-xs font-medium text-zinc-500 border border-dashed border-zinc-800 rounded-xl hover:text-[#00ffae] hover:border-[#00ffae]/30 hover:bg-[#00ffae]/5 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Configurar nova conta manualmente
          </button>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 animate-fade-in-down">
             <label className="text-[10px] uppercase text-zinc-500 font-bold mb-2 block tracking-wider">Nome da nova conta</label>
             <div className="flex gap-2">
               <input 
                 type="text"
                 placeholder="Ex: br15_NovoNick"
                 value={newAccountName}
                 onChange={(e) => setNewAccountName(e.target.value)}
                 className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-[#00ffae] focus:outline-none placeholder-zinc-700 font-mono"
                 autoFocus
               />
               <button 
                  onClick={handleCreate}
                  disabled={!newAccountName}
                  className="bg-[#00ffae] text-black font-semibold rounded-lg px-4 flex items-center gap-2 transition-all hover:bg-[#00ffae]/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide"
               >
                  Criar
               </button>
               <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white px-2">
                 ✕
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- General Section ---
interface GeneralProps {
  config: RootConfig;
  updateConfig: (key: keyof RootConfig, value: any) => void;
}

export const GeneralSection: React.FC<GeneralProps> = ({ config, updateConfig }) => {
  return (
    <Card icon={Bot} title="Status Geral" headerAction={
      <StatusBadge active={config.enabled} />
    }>
      <div className="flex flex-col gap-5">
        <div className={`flex items-center justify-between p-5 ${INNER_CARD_BG} rounded-xl border ${INNER_BORDER} hover:border-zinc-700/50 transition-colors`}>
          <div>
            <p className="text-zinc-200 font-medium mb-1 text-sm">Status do Bot</p>
            <p className="text-xs text-zinc-500">Chave geral para ativar/desativar todas as funções</p>
          </div>
          <Toggle 
            checked={config.enabled} 
            onChange={(val) => updateConfig('enabled', val)} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 ${INNER_CARD_BG} rounded-xl border ${INNER_BORDER}`}>
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Última Execução</span>
            </div>
            <p className="text-zinc-300 font-mono text-xs">Aguardando dados...</p>
          </div>
          <div className={`p-4 ${INNER_CARD_BG} rounded-xl border ${INNER_BORDER}`}>
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Próxima Ação</span>
            </div>
            <p className="text-[#00ffae] font-mono text-xs font-bold">--:--:--</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Farm Section ---
interface FarmProps {
  config: RootConfig;
  updateNestedConfig: (section: 'farm' | 'market', key: string, value: any) => void;
  onSave: () => Promise<void>;
  errors?: Record<string, string>;
}

export const FarmSection: React.FC<FarmProps> = ({ config, updateNestedConfig, onSave, errors }) => {
  const { farm } = config;
  const [isSaving, setIsSaving] = useState(false);
  
  const handleInputChange = (key: string, rawValue: string) => {
    const value = rawValue === '' ? 0 : parseInt(rawValue);
    updateNestedConfig('farm', key, value);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <Card icon={Leaf} title="Coleta com Capitão" headerAction={
      <div className="flex items-center">
        <Toggle checked={farm.enabled} onChange={(v) => updateNestedConfig('farm', 'enabled', v)} size="sm" />
        <SaveAction onSave={handleSaveClick} isSaving={isSaving} />
      </div>
    }>
      <div className="space-y-6">
        <div className={`transition-all duration-300 ${!farm.enabled ? 'opacity-30 pointer-events-none grayscale blur-[1px]' : ''}`}>
          
          {/* Inputs Intervalo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <Input 
              label="Intervalo Mínimo" 
              type="number" 
              value={farm.interval_min.toString()}
              onChange={(e) => handleInputChange('interval_min', e.target.value)}
              suffix="seg"
              error={errors?.['farm.interval_min']}
            />
            <Input 
              label="Intervalo Máximo" 
              type="number" 
              value={farm.interval_max.toString()}
              onChange={(e) => handleInputChange('interval_max', e.target.value)}
              suffix="seg"
              error={errors?.['farm.interval_max']}
            />
          </div>
          
          <div className="mb-6 p-1 border-t border-zinc-800/50 pt-6">
            <Checkbox 
              label="Randomizar ordem das cidades (Shuffle)" 
              subLabel="Simula comportamento humano variando aleatoriamente a ordem das cidades."
              checked={farm.shuffle_cities}
              onChange={(v) => updateNestedConfig('farm', 'shuffle_cities', v)}
            />
          </div>

          {/* Mock Log */}
          <div className={`${INNER_CARD_BG} rounded-xl p-5 border ${INNER_BORDER}`}>
            <h4 className="text-[10px] uppercase text-zinc-500 font-bold mb-3 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse"></span>
              Simulação de Atividade
            </h4>
            <div className="space-y-3 text-xs font-mono leading-relaxed">
              <div className="flex justify-between items-start text-zinc-500 border-l-2 border-zinc-800 pl-3">
                <span className="flex-1">Aguardando temporizador... (~{farm.interval_min}s)</span>
              </div>
               <div className="flex justify-between items-start text-[#00ffae] border-l-2 border-[#00ffae] pl-3 bg-[#00ffae]/5 py-1 rounded-r">
                <span className="flex-1 font-bold">Coleta executada com sucesso</span>
                <span className="text-[9px] uppercase tracking-wider opacity-70">Agora</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Market Section (UPDATED) ---
interface MarketProps {
  config: RootConfig;
  updateNestedConfig: (section: 'farm' | 'market', key: string, value: any) => void;
  onSave: () => Promise<void>;
  errors?: Record<string, string>;
}

export const MarketSection: React.FC<MarketProps> = ({ config, updateNestedConfig, onSave, errors }) => {
  const { market } = config;
  const [isSaving, setIsSaving] = useState(false);
  
  const handleIntChange = (key: string, rawValue: string) => {
    const value = rawValue === '' ? 0 : parseInt(rawValue);
    updateNestedConfig('market', key, value);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <Card icon={Truck} title="Envio de Recursos (Mercado)" headerAction={
       <div className="flex items-center">
          <Toggle checked={market.enabled} onChange={(v) => updateNestedConfig('market', 'enabled', v)} size="sm" />
          <SaveAction onSave={handleSaveClick} isSaving={isSaving} />
       </div>
    }>
       <div className={`space-y-6 transition-all duration-300 ${!market.enabled ? 'opacity-30 pointer-events-none grayscale blur-[1px]' : ''}`}>
          
          {/* Target ID */}
          <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
            <Input 
              label="ID CIDADE DESTINO" 
              placeholder="Ex: 6266"
              type="number"
              value={market.target_town_id}
              onChange={(e) => updateNestedConfig('market', 'target_town_id', e.target.value)}
              error={errors?.['market.target_town_id']}
              className="font-mono text-[#00ffae] font-bold"
            />
            <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-2">
              <Target className="w-3 h-3" />
              O bot vai usar esse ID para localizar a cidade no Mercado e enviar recursos.
            </p>
          </div>

          {/* Resource Selection Box - Restored & Visual Inputs Hidden */}
          <div className="bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/50">
              <h4 className="text-[10px] uppercase text-zinc-500 font-bold mb-4 tracking-widest">Tipos de recursos a enviar</h4>
              <div className="flex gap-6 flex-wrap">
                  <Checkbox label="Madeira" checked={market.send_wood} onChange={(v) => updateNestedConfig('market', 'send_wood', v)} />
                  <Checkbox label="Pedra" checked={market.send_stone} onChange={(v) => updateNestedConfig('market', 'send_stone', v)} />
                  <Checkbox label="Prata" checked={market.send_silver} onChange={(v) => updateNestedConfig('market', 'send_silver', v)} />
              </div>
              <p className="text-[11px] text-zinc-600 mt-3">O bot só envia os tipos de recursos selecionados.</p>
          </div>

          {/* Max Send Per Trip - Kept */}
          <div>
             <Input 
              label="LIMITE POR ENVIO (TOTAL)" 
              placeholder="Ex: 5000"
              type="number" 
              value={market.max_send_per_trip.toString()}
              onChange={(e) => handleIntChange('max_send_per_trip', e.target.value)}
              suffix="unid"
            />
            <p className="text-[11px] text-zinc-500 mt-1.5 ml-1">Limite máximo por viagem (soma dos recursos).</p>
           </div>

           {/* Split Equally Checkbox - Kept */}
           <div className="pt-2">
             <Checkbox 
                label="Dividir igualmente entre os recursos selecionados"
                subLabel="Se marcado, o bot tenta dividir o total a enviar igualmente entre madeira, pedra e prata."
                checked={market.split_equally}
                onChange={(v) => updateNestedConfig('market', 'split_equally', v)}
             />
           </div>

           {/* Hidden inputs: percent, delay, check_interval are deliberately not rendered per user request */}
       </div>
    </Card>
  );
};

// --- Future Section ---
export const FutureSection: React.FC = () => {
  const futures = [
    { name: "Muralha", icon: Shield },
    { name: "Construção", icon: Hammer },
    { name: "Cultura", icon: School },
    { name: "Ataques", icon: Sword },
    { name: "Espionagem", icon: Target },
  ];

  return (
    <Card title="Em Breve" className="opacity-70 border-dashed bg-transparent shadow-none hover:opacity-100 transition-opacity">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {futures.map((F, i) => (
          <div key={i} className={`flex flex-col items-center justify-center p-5 bg-zinc-900/40 border border-zinc-800/40 rounded-xl text-zinc-600 grayscale cursor-not-allowed hover:bg-zinc-800/50 transition-colors group`}>
            <F.icon className="w-6 h-6 mb-3 opacity-40 group-hover:opacity-70 group-hover:text-[#00ffae] transition-all group-hover:scale-110" />
            <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-zinc-400">{F.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};