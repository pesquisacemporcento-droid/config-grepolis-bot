import React, { useState } from 'react';
import { AlertCircle, ChevronDown, PlusCircle, UserCircle2, Users } from 'lucide-react';

interface KnownAccount {
  account: string;
  enabled: boolean;
  farmEnabled: boolean;
  intervalMin: number | null;
  intervalMax: number | null;
  updatedAt: string | null;
}

interface Props {
  accountKey: string;
  setAccountKey: (value: string) => void;
  isFetching: boolean;
  knownAccounts: KnownAccount[];
  onCreateNew: (newAccount: string) => void;
  onReloadAccounts: () => void;
}

const AccountSection: React.FC<Props> = ({
  accountKey,
  setAccountKey,
  isFetching,
  knownAccounts,
  onCreateNew,
  onReloadAccounts,
}) => {
  const [newAccountInput, setNewAccountInput] = useState('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) setAccountKey(value);
  };

  const handleCreateClick = () => {
    onCreateNew(newAccountInput || accountKey);
  };

  return (
    <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-inner space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 text-[#00ffae]" />
          Conta atual
        </h2>
        <button
          onClick={onReloadAccounts}
          type="button"
          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
        >
          <Users className="w-3 h-3" />
          Atualizar lista
        </button>
      </div>

      {/* Dropdown de contas existentes */}
      <div className="relative">
        <select
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-[#00ffae] focus:border-[#00ffae]"
          value={accountKey || ''}
          onChange={handleSelectChange}
        >
          <option value="">Selecione uma conta já configurada</option>
          {knownAccounts.map((acc) => (
            <option key={acc.account} value={acc.account}>
              {acc.account}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Campo de texto livre (sincronizado com o dropdown) */}
      <div className="space-y-1">
        <label className="text-[11px] text-zinc-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-zinc-500" />
          Use o formato <span className="font-mono text-zinc-300">mundo_nick</span> (ex:{' '}
          <span className="font-mono text-zinc-300">br14_ANDE LUZ E MARIA</span>)
        </label>
        <input
          type="text"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#00ffae] focus:border-[#00ffae]"
          placeholder="Digite ou cole a conta atual detectada pelo bot"
          value={accountKey}
          onChange={(e) => setAccountKey(e.target.value)}
        />
      </div>

      {/* Criar nova conta */}
      <div className="pt-2 border-t border-zinc-800 mt-2 space-y-2">
        <p className="text-[11px] text-zinc-500">
          Para criar uma nova conta, você pode:
          <br />• Selecionar uma existente no dropdown e editar, ou
          <br />• Digitar um novo nome e clicar em “Criar / usar conta”.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#00ffae] focus:border-[#00ffae]"
            placeholder="Novo nome de conta (opcional)"
            value={newAccountInput}
            onChange={(e) => setNewAccountInput(e.target.value)}
          />
          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#00ffae]/10 border border-[#00ffae]/40 text-xs font-semibold text-[#00ffae] hover:bg-[#00ffae]/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Criar / usar conta
          </button>
        </div>
      </div>

      {isFetching && (
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-[#00ffae] animate-pulse" />
          Carregando configuração da conta...
        </div>
      )}
    </section>
  );
};

export default AccountSection;
