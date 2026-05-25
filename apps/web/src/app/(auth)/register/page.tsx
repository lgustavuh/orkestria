'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const maskCpfCnpj = (v: string) => {
  const nums = v.replace(/\D/g, '').slice(0, 14);
  if (nums.length <= 11) return nums.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return nums.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const maskPhone = (v: string) => {
  const nums = v.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 10) return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const PLANS = [
  { id: 'STARTER', name: 'Starter', price: 'R$ 97', desc: '3 usuários · 5 projetos · 2GB' },
  { id: 'PRO', name: 'Pro', price: 'R$ 247', desc: '10 usuários · 20 projetos · 10GB', popular: true },
  { id: 'AGENCY', name: 'Agência', price: 'R$ 497', desc: 'Ilimitado · 50GB · Suporte prioritário' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('STARTER');
  const [form, setForm] = useState({
    agencyName: '', ownerName: '', ownerEmail: '', ownerPhone: '',
    ownerDocument: '', ownerPassword: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.agencyName || !form.ownerName || !form.ownerEmail || !form.ownerPassword) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    if (form.ownerPassword !== form.confirmPassword) { setError('Senhas não conferem'); return; }
    if (form.ownerPassword.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return; }

    setLoading(true);
    try {
      await api.fetch('/tenants/register', {
        method: 'POST',
        body: JSON.stringify({
          agencyName: form.agencyName,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          ownerDocument: form.ownerDocument,
          ownerPassword: form.ownerPassword,
          plan,
        }),
      });
      // Auto login
      await api.login(form.ownerEmail, form.ownerPassword);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#2A3F4E' }}>
      <div className="w-full max-w-lg" style={{ background: 'var(--bg-card)', borderRadius: '18px', padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <div className="text-center mb-6">
          <img src="/logo-icon.svg" alt="Orkestria" className="w-11 h-11 mx-auto" style={{ borderRadius: '12px' }} />
          <h1 className="text-xl font-medium mt-3 tracking-tight" style={{ color: 'var(--fg)' }}>Criar conta</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-hint)' }}>14 dias grátis · Sem cartão de crédito</p>
        </div>

        {step === 1 && (
          <div>
            <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--fg-muted)' }}>Escolha seu plano</p>
            <div className="space-y-2 mb-5">
              {PLANS.map(p => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  className="w-full flex items-center justify-between p-3 text-left transition-all"
                  style={{ borderRadius: '12px', border: plan === p.id ? '2px solid var(--brand)' : '1px solid var(--border)', background: plan === p.id ? 'var(--brand-light)' : 'transparent' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: plan === p.id ? '2px solid var(--brand)' : '2px solid var(--border)' }}>
                      {plan === p.id && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>{p.name}</span>
                        {p.popular && <span className="text-[9px] px-1.5 py-0.5 text-white" style={{ background: 'var(--brand)', borderRadius: '4px' }}>Popular</span>}
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{p.desc}</p>
                    </div>
                  </div>
                  <span className="text-[14px] font-medium" style={{ color: plan === p.id ? 'var(--brand-text)' : 'var(--fg-muted)' }}>{p.price}<span className="text-[10px]">/mês</span></span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full text-[13px]">Continuar</button>
            <p className="text-center mt-4 text-[11px]" style={{ color: 'var(--fg-hint)' }}>
              Já tem conta? <a href="/login" style={{ color: 'var(--brand)' }}>Entrar</a>
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-3">
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nome da agência *</label>
              <input className="input" value={form.agencyName} onChange={e => setForm(f => ({ ...f, agencyName: e.target.value }))} placeholder="Minha Agência Digital" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nome do responsável *</label>
                <input className="input" value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="João Silva" />
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>CPF ou CNPJ</label>
                <input className="input" value={form.ownerDocument} onChange={e => setForm(f => ({ ...f, ownerDocument: maskCpfCnpj(e.target.value) }))} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Email *</label>
                <input type="email" className="input" value={form.ownerEmail} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))} placeholder="joao@agencia.com" />
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Telefone</label>
                <input className="input" value={form.ownerPhone} onChange={e => setForm(f => ({ ...f, ownerPhone: maskPhone(e.target.value) }))} placeholder="(31) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Senha *</label>
                <input type="password" className="input" value={form.ownerPassword} onChange={e => setForm(f => ({ ...f, ownerPassword: e.target.value }))} placeholder="Mín. 8 caracteres" />
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Confirmar senha *</label>
                <input type="password" className="input" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" />
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2.5 text-[12px] text-center" style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '10px' }}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full text-[13px]">
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
            <button onClick={() => setStep(1)} className="w-full mt-2 text-[11px] py-2" style={{ color: 'var(--fg-hint)' }}>← Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
}
