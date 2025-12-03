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
      ml-3 p-1.5 rounded-lg border transition-all duration-200
      ${isSaving 
        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 cursor-wait' 
        : 'bg-[#1f2937] border-[#374151] text-gray-400 hover:text-white hover:border-gray-400 hover:bg-[#374151]/80'
      }
    `}
    title="Salvar configuração no GitHub"
  >
    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
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
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between p-4 bg-[#1f2937] rounded-xl border border-[#374151]/50">
          <div>
            <p className="text-white font-medium mb-1">Status do Bot</p>
            <p className="text-xs text-gray-500">Controle mestre para todas as automações</p>
          </div>
          <Toggle 
            checked={config.enabled} 
            onChange={(val) => updateConfig('enabled', val)} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#1f2937] rounded-xl border border-[#374151]/50">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase font-bold tracking-wider">Última Execução</span>
            </div>
            <p className="text-white font-mono">há 5 minutos</p>
          </div>
          <div className="p-4 bg-[#1f2937] rounded-xl border border-[#374151]/50">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs uppercase font-bold tracking-wider">Próxima Ação</span>
            </div>
            <p className="text-[#00ffae] font-mono">~120s</p>
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
       <p className="text-sm text-gray-400 mb-4">Ajusta automaticamente o intervalo de coleta de acordo com a força da conta.</p>
       <SegmentedControl 
          value={config.farm_level || 'custom'}
          onChange={onLevelChange}
          options={[
            { value: 'nivel1', label: 'Nível 1', description: 'Contas novas (5 min)' },
            { value: 'nivel2', label: 'Nível 2', description: 'Avançadas (10 min)' },
            { value: 'custom', label: 'Personalizado', description: 'Configuração manual' },
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
        <div className={`transition-opacity duration-300 ${!farm.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          
          <div className="mb-6">
            <Checkbox 
              label="Embaralhar ordem das cidades (Shuffle)" 
              subLabel="Simula comportamento humano variando aleatoriamente a ordem de coleta"
              checked={farm.shuffle_cities}
              onChange={(v) => updateNestedConfig('farm', 'shuffle_cities', v)}
            />
          </div>

          <div className="bg-[#0b0b0f] rounded-lg p-4 border border-[#374151]">
            <h4 className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-wider">Log de Atividade (Simulado)</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between items-center text-[#00ffae]">
                <span>[10:42] Coleta realizada: Cidade Alpha</span>
                <span className="text-xs bg-[#00ffae]/10 px-2 py-0.5 rounded">OK</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>[10:30] Coleta realizada: Cidade Beta</span>
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">OK</span>
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
       <div className={`space-y-6 transition-opacity duration-300 ${!market.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          
          <Input 
            label="ID Cidade Destino" 
            placeholder="Ex: 12345"
            type="text"
            value={market.target_town_id}
            onChange={(e) => updateNestedConfig('market', 'target_town_id', e.target.value)}
            error={errors?.['market.target_town_id']}
          />

          <div className="bg-[#1f2937] p-4 rounded-xl border border-[#374151]/50">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-3">Recursos a Enviar</span>
            <div className="flex flex-wrap gap-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

           <Checkbox 
              label="Dividir igualmente" 
              subLabel="Tenta balancear a quantidade enviada de cada recurso selecionado"
              checked={market.split_equally}
              onChange={(v) => updateNestedConfig('market', 'split_equally', v)}
            />
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
    <Card title="Em Breve" className="opacity-80">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {futures.map((F, i) => (
          <div key={i} className="flex flex-col items-center justify-center p-4 bg-[#0b0b0f]/50 border border-[#374151] rounded-xl text-gray-600 grayscale opacity-60 cursor-not-allowed hover:opacity-70 transition-opacity">
            <F.icon className="w-6 h-6 mb-2" />
            <span className="text-xs font-bold uppercase">{F.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};