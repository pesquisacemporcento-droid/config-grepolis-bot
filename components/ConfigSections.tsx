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
  Wifi
} from 'lucide-react';
import { Card, Toggle, Input, Checkbox, StatusBadge } from './UI';
import { RootConfig, KnownAccount } from '../types';

// Constants for styling
const INNER_CARD_BG = 'bg-[#09090b]'; // Zinc 950
const INNER_BORDER = 'border-[#27272a]'; // Zinc 800

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
      ml-3 p-2 rounded-lg border transition-all duration-200
      ${isSaving 
        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 cursor-wait' 
        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800'
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
    <Card icon={Terminal} title="Logs do Painel / Bot">
      <div className={`w-full h-48 overflow-y-auto custom-scrollbar font-mono text-xs p-4 rounded-lg border ${INNER_BORDER} ${INNER_CARD_BG} text-zinc-400 leading-relaxed`}>
        {logs.length === 0 ? (
          <span className="text-zinc-600 italic">Nenhum evento registrado ainda...</span>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="border-b border-zinc-800/50 last:border-0 pb-1 mb-1">
              <span className="text-zinc-600 mr-2 opacity-75">{log.split(']')[0]}]</span>
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
    <Card icon={List} title="Contas Configuradas">
      <div className="mb-3 text-xs text-zinc-500 font-medium px-1 flex justify-between items-center">
        <span>{accounts.length} conta(s) encontrada(s)</span>
      </div>
      <div className="max-h-[600px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {accounts.length === 0 ? (
          <div className="text-zinc-600 text-sm italic text-center py-4">Nenhuma conta salva.</div>
        ) : (
          accounts.map((acc) => {
            const isActive = acc.account === currentAccount;
            return (
              <button
                key={acc.account}
                onClick={() => onSelect(acc.account)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-zinc-900 border-[#00ffae] shadow-[0_0_10px_-5px_#00ffae]' 
                    : 'bg-[#09090b] border-zinc-800 hover:border-zinc-600'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className={`text-sm font-semibold truncate max-w-[70%] ${isActive ? 'text-[#00ffae]' : 'text-zinc-300'}`}>
                    {acc.account}
                  </span>
                  {/* Status Badge */}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1
                     ${acc.online 
                       ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                       : 'bg-zinc-800 text-zinc-500 border-zinc-700'}
                  `}>
                    {acc.online && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                    {acc.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    {acc.intervalMin && acc.intervalMax ? (
                        <span className={acc.farmEnabled ? 'text-green-500/80' : 'text-zinc-600'}>
                        {acc.intervalMin}–{acc.intervalMax}s
                        </span>
                    ) : (
                        <span className="text-zinc-700">--</span>
                    )}
                  </div>
                  {acc.updatedAt && (
                     <span>{formatDate(acc.updatedAt)}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </Card>
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
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2">
          <User className="w-3 h-3" /> Conta Atual
        </h2>
        <button 
          onClick={onReloadAccounts}
          className="text-[10px] flex items-center gap-1 text-[#00ffae] hover:underline bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
          title="Recarregar lista de contas"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar lista
        </button>
      </div>

      <div className="space-y-4">
        {/* Manual Input - Essential for Tampermonkey */}
        <div className="relative group">
          <Input 
            id="account" 
            label="ID da Conta (Auto-detectado ou Manual)"
            placeholder="mundo_nick, ex: br14_ANDE LUZ E MARIA"
            value={accountKey}
            onChange={(e) => setAccountKey(e.target.value)}
            className="font-mono text-[#00ffae] pr-10"
          />
          <div className="absolute right-3 top-[34px] text-zinc-500">
             {isFetching && <Loader2 className="w-4 h-4 animate-spin text-[#00ffae]" />}
          </div>
        </div>

        {/* Create New Area - Toggleable */}
        {!isCreating ? (
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full py-2 text-xs font-medium text-zinc-500 border border-dashed border-zinc-800 rounded-lg hover:text-[#00ffae] hover:border-[#00ffae]/30 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-3 h-3" />
            Configurar nova conta
          </button>
        ) : (
          <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 animate-fade-in-down">
             <label className="text-[10px] uppercase text-zinc-500 font-bold mb-2 block">Nome da nova conta</label>
             <div className="flex gap-2">
               <input 
                 type="text"
                 placeholder="Ex: br15_NovoNick"
                 value={newAccountName}
                 onChange={(e) => setNewAccountName(e.target.value)}
                 className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-[#00ffae] focus:outline-none placeholder-zinc-700 font-mono"
                 autoFocus
               />
               <button 
                  onClick={handleCreate}
                  disabled={!newAccountName}
                  className="bg-[#00ffae]/10 text-[#00ffae] border border-[#00ffae]/30 hover:bg-[#00ffae] hover:text-black rounded-lg px-3 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className={`flex items-center justify-between p-5 ${INNER_CARD_BG} rounded-xl border ${INNER_BORDER}`}>
          <div>
            <p className="text-zinc-100 font-medium mb-1">Status do Bot</p>
            <p className="text-xs text-zinc-500">Controle mestre desta conta</p>
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
            <p className="text-zinc-200 font-mono text-sm">--</p>
          </div>
          <div className={`p-4 ${INNER_CARD_BG} rounded-xl border ${INNER_BORDER}`}>
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Próxima Ação</span>
            </div>
            <p className="text-[#00ffae] font-mono text-sm">--</p>
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
        <div className={`transition-opacity duration-300 ${!farm.enabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
          
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
          
          <div className="mb-6 p-1">
            <Checkbox 
              label="Embaralhar ordem das cidades (Shuffle)" 
              subLabel="Simula comportamento humano variando aleatoriamente a ordem das cidades."
              checked={farm.shuffle_cities}
              onChange={(v) => updateNestedConfig('farm', 'shuffle_cities', v)}
            />
          </div>

          {/* Mock Log */}
          <div className={`${INNER_CARD_BG} rounded-xl p-5 border ${INNER_BORDER}`}>
            <h4 className="text-[10px] uppercase text-zinc-500 font-bold mb-3 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
              Atividade Recente (Simulado)
            </h4>
            <div className="space-y-2 text-xs font-mono leading-relaxed h-24 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start text-zinc-400">
                <span className="flex-1">[10:42] Próxima coleta em ~600s</span>
              </div>
               <div className="flex justify-between items-start text-[#00ffae]">
                <span className="flex-1">[10:50] Coleta realizada: Cidade 01</span>
                <span className="text-[10px] bg-[#00ffae]/10 px-2 py-0.5 rounded ml-2 whitespace-nowrap">OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Market Section ---
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
       <div className={`space-y-6 transition-opacity duration-300 ${!market.enabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
          
          {/* Linha 1: Target ID */}
          <div>
            <Input 
              label="ID Cidade Destino" 
              placeholder="ex: 12345"
              type="text"
              value={market.target_town_id}
              onChange={(e) => updateNestedConfig('market', 'target_town_id', e.target.value)}
              error={errors?.['market.target_town_id']}
              className="font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1 ml-1">O bot vai usar esse ID para localizar a cidade no Mercado e enviar recursos.</p>
          </div>

          {/* Linha 2: Resources */}
          <div className={`${INNER_CARD_BG} p-5 rounded-xl border ${INNER_BORDER}`}>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-4">Tipos de recursos a enviar</span>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <Checkbox 
                label="Madeira" 
                checked={market.send_wood}
                onChange={(v) => updateNestedConfig('market', 'send_wood', v)}
              />
              <Checkbox 
                label="Pedra" 
                checked={market.send_stone}
                onChange={(v) => updateNestedConfig('market', 'send_stone', v)}
              />
              <Checkbox 
                label="Prata" 
                checked={market.send_silver}
                onChange={(v) => updateNestedConfig('market', 'send_silver', v)}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-3">O bot só envia os tipos de recursos selecionados.</p>
          </div>

          {/* Linha 3: Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <Input 
              label="Percentual Max. Armazém (%)" 
              type="number" 
              min="1" max="100"
              value={market.max_storage_percent.toString()}
              onChange={(e) => handleIntChange('max_storage_percent', e.target.value)}
              error={errors?.['market.max_storage_percent']}
            />
             <div>
               <Input 
                label="Limite por envio (total)" 
                type="number" 
                value={market.max_send_per_trip.toString()}
                onChange={(e) => handleIntChange('max_send_per_trip', e.target.value)}
              />
              <p className="text-[10px] text-zinc-500 mt-1 ml-1">Limite máximo por viagem (soma dos recursos).</p>
             </div>
          </div>

          {/* Linha 4: Intervals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
                <Input 
                  label="Intervalo Verificação" 
                  type="number" 
                  value={market.check_interval.toString()}
                  onChange={(e) => handleIntChange('check_interval', e.target.value)}
                  suffix="seg"
                />
                <p className="text-[10px] text-zinc-500 mt-1 ml-1">Tempo entre verificações.</p>
             </div>
             <div>
                <Input 
                  label="Delay entre envios" 
                  type="number" 
                  value={market.delay_between_trips.toString()}
                  onChange={(e) => handleIntChange('delay_between_trips', e.target.value)}
                  suffix="seg"
                />
                <p className="text-[10px] text-zinc-500 mt-1 ml-1">Mínimo entre envios automáticos.</p>
             </div>
          </div>

          {/* Split */}
          <div className="pt-2">
            <Checkbox 
                label="Dividir igualmente entre os recursos selecionados" 
                subLabel="Se marcado, o bot tenta dividir o total a enviar igualmente entre madeira, pedra e prata."
                checked={market.split_equally}
                onChange={(v) => updateNestedConfig('market', 'split_equally', v)}
              />
          </div>

          {/* Mock Footer Log */}
          <div className="border-t border-zinc-800/50 pt-4 mt-2">
             <div className="flex justify-between text-xs text-zinc-500 font-mono">
                <span>Próxima verificação em ~120s</span>
                <span className="text-zinc-600">Último envio: 10:35</span>
             </div>
          </div>
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
    <Card title="Em Breve" className="opacity-60 border-dashed">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {futures.map((F, i) => (
          <div key={i} className={`flex flex-col items-center justify-center p-5 ${INNER_CARD_BG} border ${INNER_BORDER} rounded-xl text-zinc-600 grayscale cursor-not-allowed hover:bg-zinc-900 transition-colors`}>
            <F.icon className="w-6 h-6 mb-3 opacity-50" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{F.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};