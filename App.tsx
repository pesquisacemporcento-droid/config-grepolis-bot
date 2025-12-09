import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Download, Terminal, Copy, AlertCircle, Command, Box } from 'lucide-react';
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
    // Format: [HH:MM] Mensagem
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const line = `[${time}] ${msg}`;
    setLogs(prev => [line, ...prev].slice(200));
  }, []);

  // --- Toast Helper ---
  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
    // Log error toast automatically
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
    // Log only if it's a significant load (not just typing) - managed by useEffect debounce
    
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
           pushLog(`Conta ${acc} – Config carregada (NOVA/DEFAULT)`);
           showToast('success', `Conta nova: ${acc}`);
        } else {
           pushLog(`Conta ${acc} – Config carregada`);
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
    pushLog(`Criando nova conta: ${name}`);
    setAccountKey(name); // This will trigger useEffect -> fetchConfig -> load Default
  };

  const handleReloadAccounts = () => {
    fetchKnownAccounts();
    pushLog('Lista de contas atualizada.');
  };

  // --- Validation ---
  useEffect(() => {
    const errors: Record<string, string> = {};
    const { farm, market } = config;

    if (farm.interval_min <= 0) errors['farm.interval_min'] = 'Deve ser maior que 0';
    if (farm.interval_max < farm.interval_min) errors['farm.interval_max'] = 'Min > Max inválido';
    
    // Validate Market only if enabled
    if (market.enabled) {
      // Only validate target ID, ignore hidden fields (delay, storage %, interval)
      if (!market.target_town_id || String(market.target_town_id).trim() === '') {
        errors['market.target_town_id'] = 'ID obrigatório';
      }
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
        pushLog(`Conta ${accountKey} – Config salva com sucesso`);
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
    pushLog('JSON baixado para o computador');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopy = () => {
    if (hasErrors) return;
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setIsCopied(true);
    pushLog('JSON copiado para a área de transferência');
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24 overflow-x-hidden selection:bg-[#00ffae]/30 selection:text-[#00ffae]">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00ffae]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-[slideInDown_0.3s_ease-out] backdrop-blur-xl
          ${toastMessage.type === 'success' 
            ? 'bg-zinc-900/90 border-[#00ffae]/20 text-[#00ffae]' 
            : 'bg-zinc-900/90 border-red-500/20 text-red-400'
          }
        `}>
          <div className={`p-2 rounded-full ${toastMessage.type === 'success' ? 'bg-[#00ffae]/10' : 'bg-red-500/10'}`}>
             {toastMessage.type === 'success' ? <Save className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          </div>
          <div className="flex flex-col">
             <span className="text-sm font-bold text-white">{toastMessage.type === 'success' ? 'Sucesso' : 'Atenção'}</span>
             <span className="text-xs opacity-80">{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="relative max-w-[1400px] mx-auto px-6 py-10 sm:px-8">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8 border-b border-zinc-800/50 pb-8">
          <div className="flex items-center gap-6">
            <div className="relative p-0.5 rounded-2xl bg-gradient-to-br from-[#00ffae]/30 to-zinc-800">
               <div className="p-4 bg-zinc-950 rounded-2xl shadow-lg relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[#00ffae]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Settings className="w-8 h-8 text-[#00ffae] relative z-10" />
               </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Painel de Controle</h1>
              <p className="text-zinc-500 mt-1 flex items-center gap-2 text-sm font-medium">
                <Terminal className="w-4 h-4 text-zinc-600" />
                Grepolis Automation Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={handleCopy}
              disabled={hasErrors || !accountKey}
              className={`
                flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border
                ${isCopied 
                  ? 'bg-zinc-900 text-[#00ffae] border-[#00ffae]' 
                  : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-900'}
                 ${(hasErrors || !accountKey) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Copy className="w-4 h-4" />
              {isCopied ? 'Copiado' : 'Copiar Config'}
            </button>
            <button 
              onClick={handleDownload}
              disabled={hasErrors || !accountKey}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg
                ${isSaved 
                  ? 'bg-[#00ffae] text-black shadow-[0_0_20px_-5px_#00ffae]' 
                  : 'bg-white text-black hover:bg-zinc-200'}
                ${(hasErrors || !accountKey) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSaved ? <Save className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {isSaved ? 'Config Salva' : 'Baixar JSON'}
            </button>
          </div>
        </header>

        {hasErrors && (
          <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-300 animate-pulse backdrop-blur-sm">
             <AlertCircle className="w-5 h-5 text-red-500" />
             <span className="font-medium text-sm">Existem erros na configuração. Verifique os campos marcados em vermelho.</span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Accounts & Status) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
             {/* Account Selection Card */}
             <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-6 shadow-xl">
                <AccountSection 
                  accountKey={accountKey}
                  setAccountKey={setAccountKey}
                  isFetching={loadingConfig}
                  knownAccounts={knownAccounts}
                  onCreateNew={handleCreateNewAccount}
                  onReloadAccounts={handleReloadAccounts}
                />
             </div>
             
             {/* Quick View List */}
             <QuickView 
                accounts={knownAccounts} 
                onSelect={setAccountKey} 
                currentAccount={accountKey}
              />

              {/* General Status (Only shows if account selected) */}
              <div className={`transition-all duration-500 ${!accountKey ? 'opacity-50 pointer-events-none blur-sm' : 'opacity-100'}`}>
                <GeneralSection config={config} updateConfig={updateConfig} />
              </div>
          </div>

          {/* Right Column (Cards & Logs) */}
          <div className="lg:col-span-8">
            {!accountKey ? (
              // Empty State / Hero
              <div className="h-[600px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-800/50 rounded-3xl bg-zinc-900/20 backdrop-blur-sm">
                 <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-zinc-800">
                    <Command className="w-10 h-10 text-zinc-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">Selecione uma conta</h2>
                 <p className="text-zinc-500 max-w-md">
                   Escolha uma conta na lista à esquerda ou crie uma nova configuração para começar a editar os parâmetros do bot.
                 </p>
                 <div className="mt-8 flex gap-4 text-xs text-zinc-600 font-mono">
                    <span className="px-3 py-1 bg-zinc-900 rounded border border-zinc-800">bot_enabled: true</span>
                    <span className="px-3 py-1 bg-zinc-900 rounded border border-zinc-800">farm_mode: auto</span>
                 </div>
              </div>
            ) : (
              // Config Content
              <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                <div className="grid grid-cols-1 gap-6">
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                      <LogsSection logs={logs} />
                   </div>
                </div>
                
                <FutureSection />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-24 py-8 flex flex-col items-center justify-center border-t border-zinc-800/30">
          <div className="flex items-center gap-2 mb-2 opacity-50">
             <Box className="w-4 h-4" />
             <span className="font-bold tracking-widest text-xs uppercase">Grepolis Bot Suite</span>
          </div>
          <p className="text-[10px] text-zinc-600">
            v4.5.0 • Build Stable • 2024
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;