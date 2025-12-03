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
  Sliders,
  Save,
  Loader2
} from 'lucide-react';
import { Card, Toggle, Input, Checkbox, StatusBadge, SegmentedControl } from './UI';
import { BotConfig } from '../types';

// Constants for styling
const INNER_CARD_BG = 'bg-[#09090b]'; // Zinc 950
const INNER_BORDER = 'border-[#27272a]'; // Zinc 800

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
    title="Salvar configuração no GitHub"
  >
    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
  </button>
);

// --- General Section ---
interface GeneralProps {
  config: BotConfig;
  updateConfig: (key: keyof BotConfig, value: any) => void;
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
            <p className="text-xs text-zinc-500">Controle mestre para todas as automações</p>
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
            <p className="text-zinc-200 font-mono text-sm">há 5 minutos</p>
          </div>
          <div className={`p-4 ${INNER_CARD_BG} rounded-xl border ${INNER_BORDER}`}>
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Próxima Ação</span>
            </div>
            <p className="text-[#00ffae] font-mono text-sm">~120s</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Profile Section ---
interface ProfileProps {
  config: BotConfig;
  onLevelChange: (level: 'nivel1' | 'nivel2' | 'custom') => void;
}

export const ProfileSection: React.FC<ProfileProps> = ({ config, onLevelChange }) => {
  return (
    <Card icon={Sliders} title="Perfil da Conta">
       <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
         Selecione o perfil que melhor se adapta ao nível da sua conta para ajustar automaticamente os intervalos de coleta.
       </p>
       <SegmentedControl 
          value={config.farm_level || 'custom'}
          onChange={onLevelChange}
          options={[
            { value: 'nivel1', label: 'Nível 1', description: 'Novas (5 min)' },
            { value: 'nivel2', label: 'Nível 2', description: 'Avançadas (10 min)' },
            { value: 'custom', label: 'Personalizado', description: 'Manual' },
          ]}
       />
    </Card>
  );
}

// --- Farm Section ---
interface FarmProps {
  config: BotConfig;
  updateNestedConfig: (section: 'farm' | 'market', key: string, value: any) => void;
  onManualEdit: () => void;
  onSave: () => Promise<void>;
  errors?: Record<string, string>;
}

export const FarmSection: React.FC<FarmProps> = ({ config, updateNestedConfig, onManualEdit, onSave, errors }) => {
  const { farm } = config;
  const [isSaving, setIsSaving] = useState(false);
  
  const handleInputChange = (key: string, rawValue: string) => {
    const value = rawValue === '' ? 0 : parseInt(rawValue);
    updateNestedConfig('farm', key, value);
    onManualEdit();
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
              label="Embaralhar ordem das cidades" 
              subLabel="Simula comportamento humano variando aleatoriamente a ordem de coleta"
              checked={farm.shuffle_cities}
              onChange={(v) => updateNestedConfig('farm', 'shuffle_cities', v)}
            />
          </div>

          <div className={`${INNER_CARD_BG} rounded-xl p-5 border ${INNER_BORDER}`}>
            <h4 className="text-[10px] uppercase text-zinc-500 font-bold mb-3 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
              Log de Atividade (Simulado)
            </h4>
            <div className="space-y-3 text-xs font-mono leading-relaxed">
              <div className="flex justify-between items-start text-[#00ffae]">
                <span className="flex-1">[10:42] Coleta realizada: Cidade Alpha</span>
                <span className="text-[10px] bg-[#00ffae]/10 px-2 py-0.5 rounded ml-2 whitespace-nowrap">SUCESSO</span>
              </div>
              <div className="flex justify-between items-start text-zinc-500">
                <span className="flex-1">[10:30] Coleta realizada: Cidade Beta</span>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded ml-2 whitespace-nowrap">OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Market Section (formerly Transport) ---
interface MarketProps {
  config: BotConfig;
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
          
          <Input 
            label="ID Cidade Destino" 
            placeholder="Ex: 12345"
            type="text"
            value={market.target_town_id}
            onChange={(e) => updateNestedConfig('market', 'target_town_id', e.target.value)}
            error={errors?.['market.target_town_id']}
            className="font-mono"
          />

          <div className={`${INNER_CARD_BG} p-5 rounded-xl border ${INNER_BORDER}`}>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-4">Recursos a Enviar</span>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <Input 
              label="Percentual Max. Armazém" 
              type="number" 
              min="1" max="100"
              value={market.max_storage_percent.toString()}
              onChange={(e) => handleIntChange('max_storage_percent', e.target.value)}
              suffix="%"
              error={errors?.['market.max_storage_percent']}
            />
             <Input 
              label="Limite por envio" 
              type="number" 
              value={market.max_send_per_trip.toString()}
              onChange={(e) => handleIntChange('max_send_per_trip', e.target.value)}
            />
            <Input 
              label="Intervalo Verificação" 
              type="number" 
              value={market.check_interval.toString()}
              onChange={(e) => handleIntChange('check_interval', e.target.value)}
              suffix="seg"
            />
             <Input 
              label="Delay entre envios" 
              type="number" 
              value={market.delay_between_trips.toString()}
              onChange={(e) => handleIntChange('delay_between_trips', e.target.value)}
              suffix="seg"
            />
          </div>

           <div className="pt-2">
            <Checkbox 
                label="Dividir igualmente" 
                subLabel="Tenta balancear a quantidade enviada de cada recurso selecionado"
                checked={market.split_equally}
                onChange={(v) => updateNestedConfig('market', 'split_equally', v)}
              />
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