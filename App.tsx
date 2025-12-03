import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, Terminal, Copy, Upload, AlertCircle } from 'lucide-react';
import { BotConfig, DEFAULT_CONFIG, FarmLevel } from './types';
import { GeneralSection, FarmSection, TransportSection, FutureSection, ProfileSection } from './components/ConfigSections';
import { TextArea } from './components/UI';

const App: React.FC = () => {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // --- Logic for Presets ---
  const handleLevelChange = (level: FarmLevel) => {
    let updates: Partial<BotConfig['farm']> = {};
    
    if (level === 'nivel1') {
      updates = { interval_min: 300, interval_max: 343 };
    } else if (level === 'nivel2') {
      updates = { interval_min: 600, interval_max: 637 };
    }

    setConfig(prev => ({
      ...prev,
      farm_level: level,
      farm: { ...prev.farm, ...updates }
    }));
  };

  const handleManualFarmEdit = () => {
    if (config.farm_level !== 'custom') {
      setConfig(prev => ({ ...prev, farm_level: 'custom' }));
    }
  };

  // --- Generic Updaters ---
  const updateConfig = (key: keyof BotConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const updateNestedConfig = (section: 'farm' | 'transports', key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setIsSaved(false);
  };

  // --- Validation ---
  useEffect(() => {
    const errors: Record<string, string> = {};
    const { farm, transports } = config;

    if (farm.interval_min <= 0) errors['farm.interval_min'] = 'Deve ser maior que 0';
    if (farm.interval_max < farm.interval_min) errors['farm.interval_max'] = 'Deve ser maior ou igual ao mínimo';
    
    if (transports.max_percent < 1 || transports.max_percent > 100) errors['transports.max_percent'] = 'Entre 1 e 100';
    if (transports.enabled && (!transports.target_town_id || String(transports.target_town_id).trim() === '')) {
      errors['transports.target_town_id'] = 'ID obrigatório quando ativo';
    }

    setValidationErrors(errors);
  }, [config]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // --- Actions ---
  const handleDownload = () => {
    if (hasErrors) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopy = () => {
    if (hasErrors) return;
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      // Basic sanity check
      if (typeof parsed.enabled === 'boolean' && parsed.farm && parsed.transports) {
        setConfig(parsed);
        setImportJson('');
        setImportError('');
      } else {
        throw new Error("Formato inválido");
      }
    } catch (e) {
      setImportError('JSON inválido. Verifique a formatação.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-200 font-sans selection:bg-[#00ffae] selection:text-black pb-20">
      <div className="fixed inset-0 pointer-events-none opacity-20" 
           style={{ background: 'radial-gradient(circle at 50% 0%, #1f2937 0%, transparent 50%)' }} 
      />

      <div className="relative max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#111827] border border-[#374151] rounded-xl shadow-[0_0_15px_-5px_#00ffae]">
              <Settings className="w-8 h-8 text-[#00ffae]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Painel de Controle</h1>
              <p className="text-gray-400 mt-1 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Bot Grepolis Automation
              </p>
            </div>
          </div>

          <div className="flex gap-3">
             <button 
              onClick={handleCopy}
              disabled={hasErrors}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 border
                ${isCopied 
                  ? 'bg-[#1f2937] text-[#00ffae] border-[#00ffae]' 
                  : 'bg-[#1f2937] text-white border-[#374151] hover:bg-[#374151]'}
                 ${hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Copy className="w-5 h-5" />
              {isCopied ? 'Copiado!' : 'Copiar JSON'}
            </button>
            <button 
              onClick={handleDownload}
              disabled={hasErrors}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300
                ${isSaved 
                  ? 'bg-[#00ffae] text-black shadow-[0_0_20px_-5px_#00ffae]' 
                  : 'bg-[#1f2937] text-white hover:bg-[#374151] border border-[#374151]'}
                ${hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSaved ? <Save className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              {isSaved ? 'Salvo!' : 'Baixar JSON'}
            </button>
          </div>
        </header>

        {hasErrors && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200">
             <AlertCircle className="w-5 h-5 text-red-500" />
             <span className="font-medium">Existem erros na configuração. Corrija os campos em vermelho para salvar.</span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <GeneralSection config={config} updateConfig={updateConfig} />
            <ProfileSection config={config} onLevelChange={handleLevelChange} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <FarmSection 
              config={config} 
              updateNestedConfig={updateNestedConfig} 
              onManualEdit={handleManualFarmEdit}
              errors={validationErrors}
            />
            <TransportSection 
              config={config} 
              updateNestedConfig={updateNestedConfig} 
              errors={validationErrors}
            />
            <FutureSection />
          </div>

        </div>

        {/* Import Section */}
        <section className="mt-12 pt-8 border-t border-[#374151]/50">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
             <Upload className="w-5 h-5 text-gray-400" />
             Importar Configuração
           </h3>
           <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6">
              <TextArea 
                label="Cole o JSON aqui" 
                placeholder='{ "enabled": true, ... }'
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportError('');
                }}
                error={importError}
              />
              <button 
                onClick={handleImport}
                className="mt-4 px-6 py-2 bg-[#374151] hover:bg-[#4b5563] text-white rounded-lg font-medium transition-colors"
              >
                Carregar JSON
              </button>
           </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 py-6 text-center border-t border-[#374151]/30">
          <p className="text-sm text-gray-600">
            Bot Grepolis – Painel de Controle • Desenvolvido por IA
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
