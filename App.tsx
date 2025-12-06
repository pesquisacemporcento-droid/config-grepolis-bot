import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Download, Terminal, Copy, AlertCircle } from 'lucide-react';
import { RootConfig, DEFAULT_CONFIG, KnownAccount } from './types';
import { 
  GeneralSection, 
  FarmSection, 
  MarketSection, 
  FutureSection, 
  AccountSection,
  QuickView,
  LogsSection
} from './components/ConfigSections';

const App: React.FC = () => {
  const [accountKey, setAccountKey] = useState('');
  const [knownAccounts, setKnownAccounts] = useState<KnownAccount[]>([]);
  const [config, setConfig] = useState<RootConfig>(DEFAULT_CONFIG);
  
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [logs, setLogs] = useState<string[]>([]);

  // --- Logger Helper ---
  const pushLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    const line = `[${time}] ${msg}`;
    setLogs(prev => [line, ...prev].slice(0, 200));
  }, []);

  // --- Toast Helper ---
  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
    // Also push to logs
    if (type === 'error') pushLog(`ERRO: ${text}`);
  }, [pushLog]);

  // --- 1. Load Known Accounts (Quick View) ---
  const fetchKnownAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/list-accounts');
      const data = await res.json();
      if (data.ok && Array.isArray(data.accounts)) {
        setKnownAccounts(data.accounts);
      }
    } catch (e) {
      console.error("Failed to list accounts", e);
      pushLog('Falha ao listar contas do servidor');
    }
  }, [pushLog]);

  useEffect(() => {
    fetchKnownAccounts();
    // Also check localStorage for last account
    const savedAccount = localStorage.getItem('grepolis_bot_last_account');
    if (savedAccount) {
      setAccountKey(savedAccount);
    }
  }, [fetchKnownAccounts]);


  // --- 2. Fetch Config for Specific Account ---
  const fetchConfig = useCallback(async (acc: string) => {
    if (!acc.trim()) return;
    
    setLoadingConfig(true);
    pushLog(`Carregando configuração para: ${acc}...`);
    
    try {
      const res = await fetch(`/api/get-config?account=${encodeURIComponent(acc)}`);
      const data = await res.json();
      
      if (data.success && data.config) {
        // Deep merge with DEFAULT to ensure all keys
        setConfig({
          ...DEFAULT_CONFIG,
          ...data.config,
          farm: { ...DEFAULT_CONFIG.farm, ...(data.config.farm || {}) },
          market: { ...DEFAULT_CONFIG.market, ...(data.config.market || {}) },
        });
        
        if (data.isNew) {
           pushLog(`Conta nova detectada. Usando padrão.`);
           showToast('success', 'Nova conta. Configuração padrão carregada.');
        } else {
           pushLog(`Configuração carregada com sucesso.`);
        }
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error("Network error:", error);
      showToast('error', `Erro ao carregar: ${error.message}`);
    } finally {
      setLoadingConfig(false);
    }
  }, [pushLog, showToast]);

  // --- 3. Auto-load when accountKey changes ---
  useEffect(() => {
    if (!accountKey.trim()) return;

    localStorage.setItem('grepolis_bot_last_account', accountKey.trim());

    // Debounce to avoid multiple calls while typing
    const timer = setTimeout(() => {
      fetchConfig(accountKey.trim());
    }, 600);

    return () => clearTimeout(timer);
  }, [accountKey, fetchConfig]);


  // --- State Updates ---
  const updateConfig = (key: keyof RootConfig, value: any) => {
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

  const handleCreateNewAccount = (name: string) => {
    setAccountKey(name); // This will trigger useEffect -> fetchConfig -> load Default
    pushLog(`Iniciando criação de nova conta: ${name}`);
  };

  // --- Validation ---
  useEffect(() => {
    const errors: Record<string, string> = {};
    const { farm, market } = config;

    if (farm.interval_min <= 0) errors['farm.interval_min'] = 'Deve ser maior que 0';
    if (farm.interval_max < farm.interval_min) errors['farm.interval_max'] = 'Min > Max inválido';
    
    if (market.max_storage_percent < 1 || market.max_storage_percent > 100) errors['market.max_storage_percent'] = '1-100';
    if (market.enabled && (!market.target_town_id || String(market.target_town_id).trim() === '')) {
      errors['market.target_town_id'] = 'ID obrigatório';
    }

    setValidationErrors(errors);
  }, [config]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // --- 4. Save Logic ---
  const handleSaveToGithub = async () => {
    if (!accountKey.trim()) {
      showToast('error', 'Conta não informada.');
      return;
    }
    if (hasErrors) {
      showToast('error', 'Corrija os erros antes de salvar.');
      return;
    }

    pushLog(`Salvando alterações para ${accountKey}...`);

    try {
      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          account: accountKey.trim(),
          config 
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast('success', 'Salvo com sucesso!');
        pushLog('Configuração sincronizada com GitHub.');
        // Update list
        fetchKnownAccounts();
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', `Falha ao salvar: ${e.message}`);
    }
  };

  // --- Downloads / Copy ---
  const handleDownload = () => {
    if (hasErrors) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config${accountKey ? `_${accountKey.trim()}` : ''}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsSaved(true);
    pushLog('JSON baixado.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopy = () => {
    if (hasErrors) return;
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setIsCopied(true);
    pushLog('JSON copiado para área de transferência.');
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in-down backdrop-blur-md
          ${toastMessage.type === 'success' 
            ? 'bg-[#00ffae]/5 border-[#00ffae]/20 text-[#00ffae]' 
            : 'bg-red-500/5 border-red-500/20 text-red-400'
          }
        `}>
          {toastMessage.type === 'success' ? <Save className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      <div className="relative max-w-[1200px] mx-auto px-6 py-10 sm:px-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg">
              <Settings className="w-7 h-7 text-[#00ffae]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Painel de Controle</h1>
              <p className="text-zinc-500 mt-1 flex items-center gap-2 text-sm font-medium">
                <Terminal className="w-3.5 h-3.5" />
                Bot Grepolis Automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={handleCopy}
              disabled={hasErrors}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border
                ${isCopied 
                  ? 'bg-zinc-900 text-[#00ffae] border-[#00ffae]' 
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'}
                 ${hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Copy className="w-4 h-4" />
              {isCopied ? 'Copiado' : 'Copiar JSON'}
            </button>
            <button 
              onClick={handleDownload}
              disabled={hasErrors}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg
                ${isSaved 
                  ? 'bg-[#00ffae] text-black shadow-[0_0_15px_-5px_#00ffae]' 
                  : 'bg-zinc-100 text-black hover:bg-white'}
                ${hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSaved ? <Save className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {isSaved ? 'Salvo' : 'Baixar JSON'}
            </button>
          </div>
        </header>

        {hasErrors && (
          <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-300 animate-pulse">
             <AlertCircle className="w-5 h-5 text-red-500" />
             <span className="font-medium text-sm">Existem erros na configuração. Verifique os campos marcados em vermelho.</span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Accounts & Status) */}
          <div className="lg:col-span-4 space-y-8 h-fit">
            <div className="lg:sticky lg:top-8 space-y-8">
              <AccountSection 
                accountKey={accountKey}
                setAccountKey={setAccountKey}
                isFetching={loadingConfig}
                knownAccounts={knownAccounts}
                onCreateNew={handleCreateNewAccount}
                onReloadAccounts={fetchKnownAccounts}
              />
              
              <QuickView 
                accounts={knownAccounts} 
                onSelect={setAccountKey} 
                currentAccount={accountKey}
              />

              <div className={!accountKey ? 'opacity-50 pointer-events-none' : ''}>
                <GeneralSection config={config} updateConfig={updateConfig} />
              </div>
            </div>
          </div>

          {/* Right Column (Cards & Logs) */}
          <div className={`lg:col-span-8 space-y-8 ${!accountKey ? 'opacity-50 pointer-events-none' : ''}`}>
            {!accountKey && (
              <div className="absolute inset-0 flex items-start justify-center pt-20 z-10 pointer-events-none">
                 <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-zinc-300">
                    <AlertCircle className="w-5 h-5 text-[#00ffae]" />
                    <span>Selecione uma conta para começar a editar</span>
                 </div>
              </div>
            )}
            
            <FarmSection 
              config={config} 
              updateNestedConfig={updateNestedConfig} 
              onSave={handleSaveToGithub}
              errors={validationErrors}
            />
            <MarketSection 
              config={config} 
              updateNestedConfig={updateNestedConfig} 
              onSave={handleSaveToGithub}
              errors={validationErrors}
            />
            
            <LogsSection logs={logs} />
            
            <FutureSection />
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-20 py-8 text-center border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600 font-medium">
            Bot Grepolis – Painel de Controle Multi-Conta • v4.0
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;