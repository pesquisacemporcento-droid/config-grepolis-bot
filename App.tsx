import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, Terminal, Copy, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { BotConfig, DEFAULT_CONFIG, FarmLevel } from './types';
import { GeneralSection, FarmSection, MarketSection, FutureSection, ProfileSection } from './components/ConfigSections';
import { TextArea } from './components/UI';

const App: React.FC = () => {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // --- Load Config from GitHub API on Mount ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/get-config');
        const data = await res.json();
        
        if (data.success && data.config) {
          // Merge with default to ensure all fields exist if JSON is partial
          setConfig({
            ...DEFAULT_CONFIG,
            ...data.config,
            // Ensure nested objects merge correctly
            farm: { ...DEFAULT_CONFIG.farm, ...(data.config.farm || {}) },
            market: { ...DEFAULT_CONFIG.market, ...(data.config.market || {}) },
          });
        } else {
          console.error("Failed to load config:", data.error);
          showToast('error', 'Falha ao carregar configuração do GitHub');
        }
      } catch (error) {
        console.error("Network error:", error);
        showToast('error', 'Erro de conexão ao buscar configuração');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const updateNestedConfig = (section: 'farm' | 'market', key: string, value: any) => {
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
    const { farm, market } = config;

    if (farm.interval_min <= 0) errors['farm.interval_min'] = 'Deve ser maior que 0';
    if (farm.interval_max < farm.interval_min) errors['farm.interval_max'] = 'Deve ser maior ou igual ao mínimo';
    
    if (market.max_storage_percent < 1 || market.max_storage_percent > 100) errors['market.max_storage_percent'] = 'Entre 1 e 100';
    if (market.enabled && (!market.target_town_id || String(market.target_town_id).trim() === '')) {
      errors['market.target_town_id'] = 'ID obrigatório quando ativo';
    }

    setValidationErrors(errors);
  }, [config]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // --- API Action: Save ---
  const handleSaveToGithub = async () => {
    if (hasErrors) {
      showToast('error', 'Corrija os erros antes de salvar.');
      return;
    }

    try {
      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast('success', 'Configuração salva no GitHub com sucesso!');
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', `Falha ao salvar: ${e.message || 'Erro desconhecido'}`);
    }
  };

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
      if (typeof parsed.enabled === 'boolean' && parsed.farm && parsed.market) {
        setConfig(parsed);
        setImportJson('');
        setImportError('');
        showToast('success', 'JSON importado com sucesso. Lembre-se de salvar.');
      } else {
        throw new Error("Formato inválido: Falta 'farm' ou 'market'");
      }
    } catch (e) {
      setImportError('JSON inválido ou incompatível.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-gray-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#00ffae]" />
        <span>Carregando configuração...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-200 font-sans selection:bg-[#00ffae] selection:text-black pb-20">
      <div className="fixed inset-0 pointer-events-none opacity-20" 
           style={{ background: 'radial-gradient(circle at 50% 0%, #1f2937 0%, transparent 50%)' }} 
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 animate-fade-in-down
          ${toastMessage.type === 'success' 
            ? 'bg-[#00ffae]/10 border-[#00ffae] text-[#00ffae]' 
            : 'bg-red-500/10 border-red-500 text-red-400'
          }
        `}>
          {toastMessage.type === 'success' ? <Save className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

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
              onSave={handleSaveToGithub}
              errors={validationErrors}
            />
            <MarketSection 
              config={config} 
              updateNestedConfig={updateNestedConfig} 
              onSave={handleSaveToGithub}
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