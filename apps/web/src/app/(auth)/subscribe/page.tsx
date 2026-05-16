'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Clock, CreditCard, QrCode, FileText, Loader2, Check } from 'lucide-react';

const PLANS = [
  { id: 'STARTER', name: 'Starter', price: 97, desc: '3 usuários · 5 projetos · 2GB' },
  { id: 'PRO', name: 'Pro', price: 247, desc: '10 usuários · 20 projetos · 10GB', popular: true },
  { id: 'AGENCY', name: 'Agência', price: 497, desc: 'Ilimitado · 50GB · Suporte prioritário' },
];

const PAYMENT_METHODS = [
  { id: 'PIX', label: 'Pix', icon: QrCode, desc: 'Aprovação instantânea' },
  { id: 'BOLETO', label: 'Boleto', icon: FileText, desc: '1-3 dias úteis' },
  { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard, desc: 'Aprovação imediata' },
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

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await api.fetch<any>('/tenants/my-status');
      setTenantStatus(status);
      if (status.plan) setPlan(status.plan);
      if (!status.isSuspended && status.status === 'ACTIVE') {
        router.push('/dashboard');
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSubscribe = async () => {
    if (!tenantStatus?.tenantId) { show('Erro: tenant não encontrado', 'error'); return; }
    setSubscribing(true);
    try {
      // Create Asaas customer if not exists
      if (!tenantStatus.asaasCustomerId) {
        await api.fetch(`/billing/customer/${tenantStatus.tenantId}`, {
          method: 'POST',
          body: JSON.stringify({ name: user?.firstName || 'Cliente', email: user?.email || '' }),
        });
      }

      // Create subscription
      await api.fetch(`/billing/subscribe/${tenantStatus.tenantId}`, {
        method: 'POST',
        body: JSON.stringify({ plan, billingType: paymentMethod }),
      });

      // Get payment link
      const payment = await api.fetch<any>(`/billing/payment-link/${tenantStatus.tenantId}`);
      setPaymentInfo(payment);
      setStep(3);
    } catch (err: any) {
      show(err.message || 'Erro ao criar assinatura', 'error');
    } finally { setSubscribing(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#2d2a3e' }}>
      <div className="w-full max-w-lg" style={{ background: 'var(--bg-card)', borderRadius: '18px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo-icon.svg" alt="Orkestria" className="w-10 h-10 mx-auto" style={{ borderRadius: '11px' }} />
          {tenantStatus?.isTrial && tenantStatus?.daysLeft > 0 ? (
            <>
              <h1 className="text-lg font-medium mt-3" style={{ color: 'var(--fg)' }}>Seu teste termina em {tenantStatus.daysLeft} dias</h1>
              <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>Assine para continuar usando após o período de teste</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto mt-3 flex items-center justify-center" style={{ background: '#fef3e2', borderRadius: '12px' }}>
                <Clock size={22} style={{ color: '#d97706' }} />
              </div>
              <h1 className="text-lg font-medium mt-3" style={{ color: 'var(--fg)' }}>Seu período de teste expirou</h1>
              <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>Assine um plano para reativar sua conta e acessar seus dados</p>
            </>
          )}
        </div>

        {/* Step 1: Choose plan */}
        {step === 1 && (
          <div>
            <div className="space-y-2 mb-5">
              {PLANS.map(p => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  className="w-full flex items-center justify-between p-3 text-left transition-all"
                  style={{
                    borderRadius: '12px',
                    border: plan === p.id ? '2px solid var(--brand)' : '1px solid var(--border)',
                    background: plan === p.id ? 'var(--brand-light)' : 'transparent',
                  }}>
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
                  <span className="text-[14px] font-medium" style={{ color: plan === p.id ? 'var(--brand-text)' : 'var(--fg-muted)' }}>
                    R${p.price}<span className="text-[10px]">/mês</span>
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full text-[13px]">Escolher forma de pagamento</button>
          </div>
        )}

        {/* Step 2: Payment method */}
        {step === 2 && (
          <div>
            <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--fg-muted)' }}>
              Plano {PLANS.find(p => p.id === plan)?.name} — R${PLANS.find(p => p.id === plan)?.price}/mês
            </p>
            <div className="space-y-2 mb-5">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-all"
                  style={{
                    borderRadius: '12px',
                    border: paymentMethod === m.id ? '2px solid var(--brand)' : '1px solid var(--border)',
                    background: paymentMethod === m.id ? 'var(--brand-light)' : 'transparent',
                  }}>
                  <m.icon size={18} style={{ color: paymentMethod === m.id ? 'var(--brand-text)' : 'var(--fg-muted)' }} />
                  <div>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>{m.label}</span>
                    <p className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleSubscribe} disabled={subscribing} className="btn-primary w-full text-[13px]">
              {subscribing ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
              {subscribing ? 'Processando...' : 'Assinar agora'}
            </button>
            <button onClick={() => setStep(1)} className="w-full mt-2 text-[11px] py-2" style={{ color: 'var(--fg-hint)' }}>← Voltar</button>
          </div>
        )}

        {/* Step 3: Payment info */}
        {step === 3 && paymentInfo && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ background: '#ecfdf5', borderRadius: '12px' }}>
              <Check size={22} style={{ color: '#059669' }} />
            </div>
            <h2 className="text-[15px] font-medium mb-1" style={{ color: 'var(--fg)' }}>Assinatura criada!</h2>
            <p className="text-[12px] mb-4" style={{ color: 'var(--fg-hint)' }}>
              {paymentInfo.type === 'PIX' ? 'Escaneie o QR Code ou copie o código Pix' :
               paymentInfo.type === 'BOLETO' ? 'Acesse o boleto para pagamento' :
               'Pagamento sendo processado'}
            </p>

            {paymentInfo.type === 'PIX' && paymentInfo.qrCode && (
              <div className="mb-4">
                <img src={`data:image/png;base64,${paymentInfo.qrCode}`} alt="QR Code Pix" className="w-48 h-48 mx-auto mb-3" style={{ borderRadius: '12px' }} />
                <button onClick={() => { navigator.clipboard.writeText(paymentInfo.copyPaste); show('Código Pix copiado!'); }}
                  className="btn-secondary text-[11px] mx-auto">
                  Copiar código Pix
                </button>
              </div>
            )}

            {paymentInfo.type === 'BOLETO' && paymentInfo.bankSlipUrl && (
              <a href={paymentInfo.bankSlipUrl} target="_blank" rel="noopener" className="btn-primary text-[12px] inline-flex items-center gap-2 mb-4">
                <FileText size={14} /> Abrir boleto
              </a>
            )}

            <p className="text-[11px] mb-4" style={{ color: 'var(--fg-hint)' }}>
              Após a confirmação do pagamento, sua conta será reativada automaticamente.
            </p>

            <button onClick={() => router.push('/dashboard')} className="w-full text-[12px] py-2" style={{ color: 'var(--brand)' }}>
              Ir para o dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
