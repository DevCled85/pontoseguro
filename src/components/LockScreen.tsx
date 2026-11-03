import React, { useState } from 'react';
import { ShieldCheck, Lock, Delete, AlertCircle, Building2, User } from 'lucide-react';
import { UserSecurityConfig } from '../types/ponto';
import { hashPin } from '../db/pontoDb';

interface LockScreenProps {
  config: UserSecurityConfig | null;
  onUnlock: () => void;
  onConfigUpdated: (newConfig: UserSecurityConfig) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ config, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const userName = config?.userName || 'Cledson do Nascimento Pereira';
  const empresa = config?.empresaPadrao || 'Vidronox';

  // Handle number click on PIN pad
  const handleDigit = (digit: string) => {
    if (errorMsg) setErrorMsg('');

    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      if (next.length >= 4) {
        checkPinMatch(next);
      }
    }
  };

  const handleDelete = () => {
    if (errorMsg) setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (errorMsg) setErrorMsg('');
    setPin('');
  };

  const checkPinMatch = async (candidatePin: string) => {
    // If no pin configured yet, default is 9655
    const candidateHash = await hashPin(candidatePin);
    const targetHash = config?.pinHash || (await hashPin('9655'));

    if (candidateHash === targetHash) {
      onUnlock();
    } else if (candidatePin.length >= 4 && candidatePin.length >= (config?.pinHash ? 4 : 4)) {
      // If at 4 digits and does not match 9655
      if (candidatePin.length === 4) {
        // give brief delay before showing error or clearing
        setTimeout(async () => {
          const recheck = await hashPin(candidatePin);
          if (recheck !== targetHash) {
            setErrorMsg('PIN incorreto. Digite a senha cadastrada.');
            setPin('');
          }
        }, 300);
      }
    }
  };

  const handleManualUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateHash = await hashPin(pin);
    const targetHash = config?.pinHash || (await hashPin('9655'));

    if (candidateHash === targetHash) {
      onUnlock();
    } else {
      setErrorMsg('Senha incorreta. Verifique o PIN digitado.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Brand Lock Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            PontoSeguro
          </h1>

          <div className="mt-2 rounded-xl bg-slate-800/60 px-3 py-1.5 border border-slate-700/60 text-xs">
            <p className="font-semibold text-emerald-400 truncate max-w-[240px]">
              {userName}
            </p>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {empresa}
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Digite o PIN de 4 dígitos para acessar seus comprovantes
          </p>
        </div>

        {/* PIN Input Feedback */}
        <div className="mt-6 flex flex-col items-center">
          {/* PIN Dots feedback */}
          <div className="mb-6 flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? 'scale-110 bg-emerald-400 shadow-md shadow-emerald-500/50'
                    : 'border-2 border-slate-700 bg-slate-800'
                }`}
              />
            ))}
            {pin.length > 4 && (
              <div className="h-4 w-4 rounded-full scale-110 bg-emerald-400 shadow-md shadow-emerald-500/50" />
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-center gap-1.5 text-xs font-medium text-rose-400 text-center">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Numeric Keypad (Tactile Touch Buttons) */}
          <div className="grid w-full grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="flex h-14 items-center justify-center rounded-2xl bg-slate-800/80 text-xl font-semibold text-slate-100 transition-colors hover:bg-slate-700 active:scale-95 active:bg-emerald-600/30"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="flex h-14 items-center justify-center rounded-2xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="flex h-14 items-center justify-center rounded-2xl bg-slate-800/80 text-xl font-semibold text-slate-100 transition-colors hover:bg-slate-700 active:scale-95 active:bg-emerald-600/30"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Apagar dígito"
              className="flex h-14 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 active:scale-95"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {pin.length >= 4 && (
            <button
              type="button"
              onClick={handleManualUnlockSubmit}
              className="mt-4 w-full h-11 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              Desbloquear Sistema
            </button>
          )}

          <div className="mt-5 text-center text-xs text-slate-500">
            <span className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Banco de dados local protegido · Vidronox
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
