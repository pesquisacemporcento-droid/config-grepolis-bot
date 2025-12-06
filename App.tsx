import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Download, Terminal, Copy, AlertCircle, PlusCircle, RefreshCw } from 'lucide-react';
import { RootConfig, DEFAULT_CONFIG } from './types';
import { GeneralSection, FarmSection, MarketSection, FutureSection } from './components/ConfigSections';
import AccountSection from './components/AccountSection';
import LogsSection from './components/LogsSection';

type ToastType = 'success' | 'error';

interface ToastState {
  type: ToastType;
  text: string;
}

interface KnownAccount {
  account: string;
  enabled: boolean;
  farmEnabled: boolean;
  intervalMin: number | null;
  intervalMax: number | null;
  updatedAt: string | null;
}

const App: React.FC = () => {
  const [accountKey, setAccountKey] = useState('');
  const [config, setConfig] = useState<RootConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<ToastState | null>(null);

  const [knownAccounts, setKnownAccounts] = useState<KnownAccount[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // -------- LOGS LOCAIS (tempo “real” do painel) -----------
  const pushLog = useCallback((msg: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setLogs((prev) => [line, ...prev].slice(0, 200));
    // opcional: também no console
    console.log('[PAINEL]', line);
  }, []);

  // Carrega conta da sessão anterior
  useEffect(() => {
    const savedAccount = localStorage.getItem('grepolis_bot_last_account');
    if (savedAccount) {
      setAccountKey(savedAccount);
    }
  }, []);

  const showToast = (type: ToastType, text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------- LISTA DE CONTAS (dropdown + visão rápida) --------
  const loadAccountsList = useCallback(async () => {
    try {
      const res = await fetch('/api/list-accounts');
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Erro HTTP ${res.status}`);
      }

      setKnownAccounts(data.accounts || []);
    } catch (e: any) {
      console.error('Erro carregando lista de contas:', e);
      pushLog(`Falha ao carregar lista de contas: ${e.message || 'Erro desconhecido'}`);
    }
  }, [pushLog]);

  useEffect(() => {
    loadAccountsList();
  }, [loadAccountsList]);

  // -------- BUSCAR CONFIG POR CONTA --------
  const fetchConfig = useCallback(
    async (acc: string) => {
      const trimmed = acc.trim();
      if (!trimmed) return;

      setLoading(true);
      pushLog(`Carregando configuração para conta ${trimmed}...`);

      try {
        const res = await fetch(`/api/get-config?account=${encodeURIComponent(trimmed)}`);
        const data = await res.json().catch(() => {
          throw new Error('Resposta inválida do servidor');
        });

        if (!res.ok) {
          throw new Error(data?.error || `Erro HTTP ${res.status}`);
        }

        if (data && data.ok && data.config) {
          const cfg = data.config;

          setConfig({
            ...DEFAULT_CONFIG,
            ...cfg,
            farm: { ...DEFAULT_CONFIG.farm, ...(cfg.farm || {}) },
            market: { ...DEFAULT_CONFIG.market, ...(cfg.market || {}) },
          });

          if (data.isNew) {
            showToast('success', `Nova configuração criada para ${trimmed}`);
            pushLog(`Nova configuração criada para ${trimmed}.`);
          } else {
            showToast('success', `Configuração carregada para ${trimmed}`);
            pushLog(
              `Configuração carregada para ${trimmed} (farm ${
                cfg.farm?.enabled ? 'ON' : 'OFF'
              }, intervalo ${cfg.farm?.interval_min ?? '?'}–${cfg.farm?.interval_max ?? '?'})`,
            );
          }
        } else {
          showToast('error', data?.error || 'Falha ao carregar configuração');
          pushLog(`Falha ao carregar configuração para ${trimmed}: ${data?.error || 'erro desconhecido'}`);
        }
      } catch (error: any) {
        console.error('Erro ao buscar config:', error);
        showToast('error', `Erro de conexão: ${error.message || 'Desconhecido'}`);
        pushLog(`Erro de conexão ao buscar configuração para ${trimmed}: ${error.message || 'Desconhecido'}`);
      } finally {
        setLoading(false);
      }
    },
    [pushLog],
  );

  // Busca automática ao mudar a conta (com debounce)
  useEffect(() => {
    if (!accountKey.trim()) return;

    localStorage.setItem('grepolis_bot_last_account', accountKey.trim());

    const timer = setTimeout(() => {
      fetchConfig(accountKey.trim());
    }, 600);

    return () => clearTimeout(timer);
  }, [accountKey, fetchConfig]);

  // -------- ATUALIZAÇÕES DE CONFIG --------
  const updateConfig = (key: keyof RootConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const updateNestedConfig = (section: 'farm' | 'market', key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setIsSaved(false);
  };

  // Validação
  useEffect(() => {
    const errors: Record<string, string> = {};
    const { farm, market } = config;

    if (farm.interval_min <= 0) errors['farm.interval_min'] = 'Deve ser maior que 0';
    if (farm.interval_max < farm.interval_min) errors['farm.interval_max'] = 'Deve ser maior ou igual ao mínimo';

    if (market.max_storage_percent < 1 || market.max_storage_percent > 100)
      errors['market.max_storage_percent'] = 'Entre 1 e 100';
    if (market.enabled && (!market.target_town_id || String(market.target_town_id).trim() === '')) {
      errors['market.target_town_id'] = 'ID obrigatório quando ativo';
    }

    setValidationErrors(errors);
  }, [config]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // -------- SALVAR CONFIG NO GITHUB --------
  const handleSaveToGithub = async () => {
    const trimmed = accountKey.trim();

    if (!trimmed) {
      showToast('error', 'É necessário informar uma conta.');
      return;
    }
    if (hasErrors) {
      showToast('error', 'Corrija os erros antes de salvar.');
      return;
    }

    try {
      pushLog(`Salvando configuração para ${trimmed}...`);

      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: trimmed,
          config,
        }),
      });

      const data = await res.json().catch(() => {
        throw new Error('Resposta inválida do servidor ao salvar');
      });

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Erro HTTP ${res.status}`);
      }

      showToast('success', `Configuração salva com sucesso para ${trimmed}!`);
      pushLog(`Configuração salva com sucesso para ${trimmed}.`);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);

      // recarrega lista de contas para atualizar visão rápida
      loadAccountsList();
    } catch (e: any) {
      console.error('Erro ao salvar config:', e);
      showToast('error', `Falha ao salvar: ${e.message || 'Erro desconhecido'}`);
      pushLog(`Falha ao salvar configuração para ${trimmed}: ${e.message || 'Erro desconhecido'}`);
    }
  };

  // Criar nova conta (apenas seleciona nome; DEFAULT_CONFIG é usado localmente)
  const handleCreateNewAccount = (newAccount: string) => {
    const trimmed = newAccount.trim();
    if (!trimmed) {
      showToast('error', 'Informe um nome de conta válido (mundo_nick).');
      return;
    }

    setAccountKey(trimmed);
    setConfig(DEFAULT_CONFIG);
    setIsSaved(false);
    pushLog(`Nova conta selecionada/criada localmente: ${trimmed}. Salve para gravar no GitHub.`);
    showToast('success', `Conta ${trimmed} pronta para configurar. Salve para gravar no GitHub.`);
  };

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
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopy = () => {
    if (hasErrors) return;
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      {/* Background decoration */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in-down backdrop-blur-md
          ${
            toastMessage.type === 'success'
              ? 'bg-[#00ffae]/5 border-[#00ffae]/20 text-[#00ffae]'
              : 'bg-red-500/5 border-red-500/20 text-red-400'
          }
        `}
        >
          {toastMessage.type === 'success' ? <Save className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      <div className="relative max-w-[1100px] mx-auto px-6 py-10 sm:px-8">
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
                Bot Grepolis Automation • Multi-Conta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              disabled={hasErrors}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border
                ${
                  isCopied
                    ? 'bg-zinc-900 text-[#00ffae] border-[#00ffae]'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                }
                 ${hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Copy className="w-4 h-4" />
              {isCopied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={handleDownload}
              disabled={hasErrors}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg
                ${
                  isSaved
                    ? 'bg-[#00ffae] text-black shadow-[0_0_15px_-5px_#00ffae]'
                    : 'bg-zinc-100 text-black hover:bg-white'
                }
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
            <span className="font-medium text-sm">
              Existem erros na configuração. Verifique os campos marcados em vermelho.
            </span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Sticky) */}
          <div className="lg:col-span-4 space-y-8 h-fit lg:sticky lg:top-8">
            <AccountSection
              accountKey={accountKey}
              setAccountKey={setAccountKey}
              isFetching={loading}
              knownAccounts={knownAccounts}
              onCreateNew={handleCreateNewAccount}
              onReloadAccounts={loadAccountsList}
            />

            <div className={!accountKey ? 'opacity-50 pointer-events-none' : ''}>
              <GeneralSection config={config} updateConfig={updateConfig} />
            </div>

            {/* Visão rápida das contas */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#00ffae]" />
                  Contas configuradas
                </h3>
                <span className="text-[11px] text-zinc-500">{knownAccounts.length} contas</span>
              </div>
              {knownAccounts.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Nenhuma conta salva ainda. Salve uma configuração para ela aparecer aqui.
                </p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-auto pr-1 text-xs">
                  {knownAccounts.map((acc) => (
                    <li
                      key={acc.account}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md bg-zinc-900/70 border border-zinc-800 cursor-pointer hover:border-[#00ffae]/40 ${
                        acc.account === accountKey ? 'border-[#00ffae]/70' : ''
                      }`}
                      onClick={() => setAccountKey(acc.account)}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200 truncate max-w-[160px]">{acc.account}</span>
                        <span className="text-[10px] text-zinc-500">
                          Bot: {acc.enabled ? 'ON' : 'OFF'} • Farm:{' '}
                          {acc.farmEnabled ? `${acc.intervalMin ?? '?'}–${acc.intervalMax ?? '?'}` : 'OFF'}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-600">
                        {acc.updatedAt ? new Date(acc.updatedAt).toLocaleDateString() : '--'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column */}
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

            {/* Logs avançados */}
            <LogsSection logs={logs} />
            <FutureSection />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 py-8 text-center border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600 font-medium">
            Bot Grepolis – Painel de Controle Multi-Conta • v3.1 (dropdown, visão rápida e logs)
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
