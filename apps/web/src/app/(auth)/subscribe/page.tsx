'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Clock, CreditCard, QrCode, FileText, Loader2, Check, Copy, ExternalLink } from 'lucide-react';

const maskCpfCnpj = (v: string) => {
  const nums = v.replace(/\D/g, '').slice(0, 14);
  if (nums.length <= 11) {
    return nums.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return nums.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const maskPhone = (v: string) => {
  const nums = v.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 10) return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const PLANS = [
  { id: 'STARTER', name: 'Starter', price: 97, desc: '3 usuários · 5 projetos · 2GB' },
  { id: 'PRO', name: 'Pro', price: 247, desc: '10 usuários · 20 projetos · 10GB', popular: true },
  { id: 'AGENCY', name: 'Agência', price: 497, desc: 'Ilimitado · 50GB · Suporte prioritário' },
];

export default function SubscribePage() {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const { show } = useToast();

  const [tenantStatus, setTenantStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('STARTER');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [subscribing, setSubscribing] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  // Customer data for Asaas
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', cpfCnpj: '', phone: '' });

  useEffect(() => { checkStatus(); }, []);

  // Poll for payment confirmation
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const status = await api.fetch<any>('/tenants/my-status');
        if (status.status === 'ACTIVE') {
          setPolling(false);
          show('Pagamento confirmado! Redirecionando...');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [polling]);

  const checkStatus = async () => {
    try {
      const status = await api.fetch<any>('/tenants/my-status');
      setTenantStatus(status);
      if (status.plan) setPlan(status.plan);
      if (!status.isSuspended && status.status === 'ACTIVE') router.push('/dashboard');
      // Pre-fill customer form
      setCustomerForm(f => ({
        ...f,
        name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : f.name,
        email: user?.email || f.email,
      }));
    } catch {} finally { setLoading(false); }
  };

  const handleSubscribe = async () => {
    if (!customerForm.cpfCnpj) { show('CPF ou CNPJ é obrigatório', 'error'); return; }
    if (!tenantStatus?.tenantId) { show('Erro: tenant não encontrado', 'error'); return; }
    setSubscribing(true);
    try {
      // 1. Create Asaas customer if not exists
      if (!tenantStatus.asaasCustomerId) {
        await api.fetch(`/billing/customer/${tenantStatus.tenantId}`, {
          method: 'POST',
          body: JSON.stringify(customerForm),
        });
      }

      // 2. Create subscription
      await api.fetch(`/billing/subscribe/${tenantStatus.tenantId}`, {
        method: 'POST',
        body: JSON.stringify({ plan, billingType: paymentMethod }),
      });

      // 3. Get payment info
      const payment = await api.fetch<any>(`/billing/payment-link/${tenantStatus.tenantId}`);
      setPaymentInfo(payment);
      setStep(3);
      setPolling(true);
    } catch (err: any) {
      show(err.message || 'Erro ao criar assinatura', 'error');
    } finally { setSubscribing(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#2A3F4E' }}>
      <div className="w-full max-w-lg" style={{ background: 'var(--bg-card)', borderRadius: '18px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo-icon.svg" alt="Orkestria" className="w-10 h-10 mx-auto" style={{ borderRadius: '11px' }} />
          {tenantStatus?.isTrial && tenantStatus?.daysLeft > 0 ? (
            <>
              <h1 className="text-lg font-medium mt-3" style={{ color: 'var(--fg)' }}>Seu teste termina em {tenantStatus.daysLeft} dias</h1>
              <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>Assine para continuar usando</p>
            </>
          ) : step < 3 ? (
            <>
              <div className="w-12 h-12 mx-auto mt-3 flex items-center justify-center" style={{ background: '#fef3e2', borderRadius: '12px' }}>
                <Clock size={22} style={{ color: '#d97706' }} />
              </div>
              <h1 className="text-lg font-medium mt-3" style={{ color: 'var(--fg)' }}>Seu período de teste expirou</h1>
              <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>Assine para reativar sua conta</p>
            </>
          ) : null}
        </div>

        {/* Step 1: Choose plan */}
        {step === 1 && (
          <div>
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
                  <span className="text-[14px] font-medium" style={{ color: plan === p.id ? 'var(--brand-text)' : 'var(--fg-muted)' }}>R${p.price}<span className="text-[10px]">/mês</span></span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full text-[13px]">Continuar</button>
          </div>
        )}

        {/* Step 2: Payment method + customer data */}
        {step === 2 && (
          <div>
            <div className="p-3 mb-4" style={{ background: 'var(--bg-secondary)', borderRadius: '10px' }}>
              <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
                Plano <span className="font-medium" style={{ color: 'var(--fg)' }}>{PLANS.find(p => p.id === plan)?.name}</span> — R${PLANS.find(p => p.id === plan)?.price}/mês
              </p>
            </div>

            {/* Customer data */}
            <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Dados para faturamento</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <input className="input text-[12px]" placeholder="Nome completo" value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <input className="input text-[12px]" placeholder="CPF ou CNPJ *" value={customerForm.cpfCnpj} onChange={e => setCustomerForm(f => ({ ...f, cpfCnpj: maskCpfCnpj(e.target.value) }))} />
              </div>
              <div>
                <input className="input text-[12px]" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <input className="input text-[12px]" placeholder="(31) 99999-9999" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: maskPhone(e.target.value) }))} />
              </div>
            </div>

            {/* Payment method */}
            <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Forma de pagamento</p>
            <div className="flex gap-2 mb-5">
              {[
                { id: 'PIX', label: 'Pix', icon: QrCode },
                { id: 'BOLETO', label: 'Boleto', icon: FileText },
                { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard },
              ].map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
                  style={{ borderRadius: '10px', border: paymentMethod === m.id ? '2px solid var(--brand)' : '1px solid var(--border)', background: paymentMethod === m.id ? 'var(--brand-light)' : 'transparent' }}>
                  <m.icon size={18} style={{ color: paymentMethod === m.id ? 'var(--brand-text)' : 'var(--fg-hint)' }} />
                  <span className="text-[11px]" style={{ color: paymentMethod === m.id ? 'var(--brand-text)' : 'var(--fg-muted)' }}>{m.label}</span>
                </button>
              ))}
            </div>

            <button onClick={handleSubscribe} disabled={subscribing} className="btn-primary w-full text-[13px]">
              {subscribing ? <><Loader2 size={14} className="animate-spin inline mr-2" />Processando...</> : 'Assinar agora'}
            </button>
            <button onClick={() => setStep(1)} className="w-full mt-2 text-[11px] py-2" style={{ color: 'var(--fg-hint)' }}>← Voltar</button>
          </div>
        )}

        {/* Step 3: Payment display - inline */}
        {step === 3 && paymentInfo && (
          <div>
            <div className="text-center mb-4">
              <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center" style={{ background: '#ecfdf5', borderRadius: '10px' }}>
                <Check size={18} style={{ color: '#059669' }} />
              </div>
              <h2 className="text-[15px] font-medium" style={{ color: 'var(--fg)' }}>Assinatura criada!</h2>
            </div>

            {/* PIX Payment */}
            {paymentInfo.type === 'PIX' && (
              <div className="text-center">
                {paymentInfo.qrCode ? (
                  <div className="p-4 mb-3" style={{ background: 'var(--bg-secondary)', borderRadius: '14px' }}>
                    <img src={`data:image/png;base64,${paymentInfo.qrCode}`} alt="QR Code Pix" className="w-44 h-44 mx-auto" />
                  </div>
                ) : null}
                {paymentInfo.copyPaste && (
                  <div className="mb-3">
                    <p className="text-[11px] mb-1" style={{ color: 'var(--fg-hint)' }}>Código Pix copia e cola</p>
                    <div className="flex items-center gap-2 p-2" style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <input className="flex-1 bg-transparent text-[10px] outline-none truncate" readOnly value={paymentInfo.copyPaste} style={{ color: 'var(--fg-muted)', fontFamily: 'monospace' }} />
                      <button onClick={() => { navigator.clipboard.writeText(paymentInfo.copyPaste); show('Código copiado!'); }}
                        className="p-1.5 flex-shrink-0" style={{ color: 'var(--brand)', borderRadius: '6px' }}><Copy size={13} /></button>
                    </div>
                  </div>
                )}
                {!paymentInfo.qrCode && paymentInfo.invoiceUrl && (
                  <a href={paymentInfo.invoiceUrl} target="_blank" rel="noopener" className="btn-primary text-[12px] inline-flex items-center gap-2 mb-3">
                    <QrCode size={14} /> Abrir página de pagamento Pix
                  </a>
                )}
              </div>
            )}

            {/* BOLETO Payment */}
            {paymentInfo.type === 'BOLETO' && (
              <div className="text-center">
                <p className="text-[12px] mb-3" style={{ color: 'var(--fg-hint)' }}>Seu boleto foi gerado</p>
                <a href={paymentInfo.bankSlipUrl || paymentInfo.invoiceUrl} target="_blank" rel="noopener" className="btn-primary text-[12px] inline-flex items-center gap-2 mb-3">
                  <FileText size={14} /> Abrir boleto
                </a>
              </div>
            )}

            {/* CREDIT CARD Payment */}
            {paymentInfo.type === 'CREDIT_CARD' && (
              <div className="text-center">
                <p className="text-[12px] mb-3" style={{ color: 'var(--fg-hint)' }}>Insira os dados do cartão na página de pagamento</p>
                <a href={paymentInfo.invoiceUrl} target="_blank" rel="noopener" className="btn-primary text-[12px] inline-flex items-center gap-2 mb-3">
                  <CreditCard size={14} /> Pagar com cartão <ExternalLink size={11} />
                </a>
              </div>
            )}

            {/* Waiting for confirmation */}
            <div className="flex items-center justify-center gap-2 p-3 mt-3" style={{ background: 'var(--brand-light)', borderRadius: '10px' }}>
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--brand-text)' }} />
              <p className="text-[11px]" style={{ color: 'var(--brand-text)' }}>Aguardando confirmação do pagamento...</p>
            </div>

            <p className="text-center text-[10px] mt-3" style={{ color: 'var(--fg-hint)' }}>
              A página atualiza automaticamente quando o pagamento for confirmado
            </p>

            <button onClick={() => router.push('/dashboard')} className="w-full text-[12px] py-2 mt-3" style={{ color: 'var(--fg-hint)' }}>
              Ir para o dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
