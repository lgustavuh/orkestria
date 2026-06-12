'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, Building2, X, Upload, FileText, User, ExternalLink, Camera, Globe, Key } from 'lucide-react';

// ── Countries with DDI ──
const COUNTRIES = [
  { name: 'Brasil', ddi: '55', flag: '🇧🇷' },
  { name: 'Portugal', ddi: '351', flag: '🇵🇹' },
  { name: 'Estados Unidos', ddi: '1', flag: '🇺🇸' },
  { name: 'Espanha', ddi: '34', flag: '🇪🇸' },
  { name: 'Argentina', ddi: '54', flag: '🇦🇷' },
  { name: 'Angola', ddi: '244', flag: '🇦🇴' },
  { name: 'Moçambique', ddi: '258', flag: '🇲🇿' },
  { name: 'Cabo Verde', ddi: '238', flag: '🇨🇻' },
  { name: 'Alemanha', ddi: '49', flag: '🇩🇪' },
  { name: 'Austrália', ddi: '61', flag: '🇦🇺' },
  { name: 'Áustria', ddi: '43', flag: '🇦🇹' },
  { name: 'Bélgica', ddi: '32', flag: '🇧🇪' },
  { name: 'Bolívia', ddi: '591', flag: '🇧🇴' },
  { name: 'Canadá', ddi: '1', flag: '🇨🇦' },
  { name: 'Chile', ddi: '56', flag: '🇨🇱' },
  { name: 'China', ddi: '86', flag: '🇨🇳' },
  { name: 'Colômbia', ddi: '57', flag: '🇨🇴' },
  { name: 'Coreia do Sul', ddi: '82', flag: '🇰🇷' },
  { name: 'Cuba', ddi: '53', flag: '🇨🇺' },
  { name: 'Dinamarca', ddi: '45', flag: '🇩🇰' },
  { name: 'Egito', ddi: '20', flag: '🇪🇬' },
  { name: 'Equador', ddi: '593', flag: '🇪🇨' },
  { name: 'Finlândia', ddi: '358', flag: '🇫🇮' },
  { name: 'França', ddi: '33', flag: '🇫🇷' },
  { name: 'Grécia', ddi: '30', flag: '🇬🇷' },
  { name: 'Guiné-Bissau', ddi: '245', flag: '🇬🇼' },
  { name: 'Holanda', ddi: '31', flag: '🇳🇱' },
  { name: 'Índia', ddi: '91', flag: '🇮🇳' },
  { name: 'Irlanda', ddi: '353', flag: '🇮🇪' },
  { name: 'Israel', ddi: '972', flag: '🇮🇱' },
  { name: 'Itália', ddi: '39', flag: '🇮🇹' },
  { name: 'Japão', ddi: '81', flag: '🇯🇵' },
  { name: 'México', ddi: '52', flag: '🇲🇽' },
  { name: 'Noruega', ddi: '47', flag: '🇳🇴' },
  { name: 'Paraguai', ddi: '595', flag: '🇵🇾' },
  { name: 'Peru', ddi: '51', flag: '🇵🇪' },
  { name: 'Polônia', ddi: '48', flag: '🇵🇱' },
  { name: 'Reino Unido', ddi: '44', flag: '🇬🇧' },
  { name: 'Rússia', ddi: '7', flag: '🇷🇺' },
  { name: 'São Tomé e Príncipe', ddi: '239', flag: '🇸🇹' },
  { name: 'Suécia', ddi: '46', flag: '🇸🇪' },
  { name: 'Suíça', ddi: '41', flag: '🇨🇭' },
  { name: 'Timor-Leste', ddi: '670', flag: '🇹🇱' },
  { name: 'Turquia', ddi: '90', flag: '🇹🇷' },
  { name: 'Uruguai', ddi: '598', flag: '🇺🇾' },
  { name: 'Venezuela', ddi: '58', flag: '🇻🇪' },
].sort((a, b) => a.name.localeCompare(b.name));

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// ── Masks ──
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
}

function maskPhone(v: string, ddi: string): string {
  const d = v.replace(/\D/g, '');
  if (!d) return `+${ddi} `;
  // Remove DDI prefix if user typed it
  const num = d.startsWith(ddi) ? d.slice(ddi.length) : d;
  const n = num.slice(0, 12);
  if (ddi === '55') {
    if (n.length <= 2) return `+55 ${n}`;
    if (n.length <= 7) return `+55 ${n.slice(0,2)} ${n.slice(2)}`;
    return `+55 ${n.slice(0,2)} ${n.slice(2,7)}-${n.slice(7)}`;
  }
  // Generic: +CCC NNNN NNNN
  if (n.length <= 4) return `+${ddi} ${n}`;
  if (n.length <= 8) return `+${ddi} ${n.slice(0,4)} ${n.slice(4)}`;
  return `+${ddi} ${n.slice(0,4)} ${n.slice(4,8)} ${n.slice(8)}`;
}

interface ClientForm {
  name: string; companyName: string; email: string; phone: string;
  documentType: 'PF' | 'PJ'; document: string;
  address: string; city: string; state: string; zipCode: string;
  country: string; website: string; notes: string;
}

const emptyForm: ClientForm = {
  name: '', companyName: '', email: '', phone: '',
  documentType: 'PJ', document: '', address: '', city: '',
  state: '', zipCode: '', country: 'Brasil', website: '', notes: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>({ ...emptyForm });
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [portalInfo, setPortalInfo] = useState<{ email: string; password: string } | null>(null);
  const [savedContractUrl, setSavedContractUrl] = useState<string | null>(null);
  const [logoPreviews, setLogoPreviews] = useState<Record<string, string>>({});
  const [portalEditId, setPortalEditId] = useState<string | null>(null);
  const [portalForm, setPortalForm] = useState({ email: '', password: '' });
  const { hasRole } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const isBrazil = form.country === 'Brasil';
  const currentDDI = COUNTRIES.find(c => c.name === form.country)?.ddi || '55';

  useEffect(() => {
    if (!hasRole('ADMIN') && !hasRole('STRATEGIST')) { router.push('/dashboard'); return; }
    load();
  }, []);

  const load = () => api.getClients({}).then((res: any) => {
    setClients(res);
    (res.data || []).forEach((cl: any) => {
      if (cl.logoUrl && !logoPreviews[cl.id]) {
        api.fetch<any>(`/files/download-url?key=${encodeURIComponent(cl.logoUrl)}`).then(r => {
          setLogoPreviews(p => ({ ...p, [cl.id]: r.downloadUrl }));
        }).catch(() => {});
      }
    });
  }).catch(() => {});

  const setField = useCallback(<K extends keyof ClientForm>(key: K, value: ClientForm[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleCountryChange = (country: string) => {
    const c = COUNTRIES.find(x => x.name === country);
    setForm(f => ({
      ...f,
      country,
      phone: c ? `+${c.ddi} ` : '+',
      state: country !== 'Brasil' ? '' : f.state,
      zipCode: country !== 'Brasil' ? '' : f.zipCode,
      city: country !== 'Brasil' ? f.city : f.city,
    }));
  };

  // ViaCEP auto-fill for Brazil
  const handleCEPChange = async (value: string) => {
    const masked = maskCEP(value);
    setField('zipCode', masked);
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8 && isBrazil) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(f => ({
            ...f,
            city: data.localidade || f.city,
            state: data.uf || f.state,
            address: data.logradouro ? `${data.logradouro}${data.complemento ? ', ' + data.complemento : ''} - ${data.bairro || ''}` : f.address,
          }));
        }
      } catch {}
    }
  };

  const handleLogoSelect = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { show('Nome é obrigatório', 'error'); return; }
    setUploading(true);
    try {
      const data: any = {
        name: form.name, companyName: form.companyName || undefined,
        email: form.email || undefined,
        phone: form.phone.replace(/\D/g, '').length >= 8 ? form.phone : undefined,
        document: form.document.replace(/\D/g, '') || undefined,
        documentType: form.documentType,
        address: form.address || undefined, city: form.city || undefined,
        state: form.state || undefined,
        zipCode: isBrazil ? (form.zipCode.replace(/\D/g, '') || undefined) : (form.zipCode || undefined),
        country: form.country, website: form.website || undefined, notes: form.notes || undefined,
      };

      // Upload logo first
      if (logoFile) {
        try {
          const logoReader = new FileReader();
          const logoData: string = await new Promise((res, rej) => { logoReader.onload = () => res((logoReader.result as string).split(',')[1]); logoReader.onerror = rej; logoReader.readAsDataURL(logoFile); });
          const p = await api.fetch<any>('/files/upload-direct', { method: 'POST', body: JSON.stringify({ fileData: logoData, fileName: logoFile.name, mimeType: logoFile.type }) });
          data.logoUrl = p.s3Key;
          // Also convert to base64 for portal user avatar
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const clientId = editId;
              if (clientId) {
                await api.fetch(`/clients/${clientId}/portal-access`, { method: 'PATCH', body: JSON.stringify({ avatarBase64: reader.result }) });
              }
            } catch {}
          };
          reader.readAsDataURL(logoFile);
        } catch { show('Erro no upload do logo', 'error'); }
      }

      let client;
      if (editId) {
        client = await api.updateClient(editId, data);
      } else {
        client = await api.createClient(data);
        if (client.portalUser) {
          setPortalInfo({ email: client.portalUser.email, password: client.portalUser.password });
        }
      }

      // Upload contract
      if (contractFile && client?.id) {
        try {
          const contractReader = new FileReader();
          const contractData: string = await new Promise((res, rej) => { contractReader.onload = () => res((contractReader.result as string).split(',')[1]); contractReader.onerror = rej; contractReader.readAsDataURL(contractFile); });
          const p = await api.fetch<any>('/files/upload-direct', { method: 'POST', body: JSON.stringify({ fileData: contractData, fileName: contractFile.name, mimeType: 'application/pdf' }) });
          await api.updateClient(client.id, { contractUrl: p.s3Key });
          setSavedContractUrl(p.s3Key);
        } catch { show('Erro no upload do contrato', 'error'); }
      }

      show(editId ? 'Cliente atualizado' : 'Cliente criado');
      closeForm();
      load();
    } catch (err: any) { show(err.message, 'error'); }
    finally { setUploading(false); }
  };

  const closeForm = () => {
    setShowForm(false); setEditId(null); setForm({ ...emptyForm });
    setContractFile(null); setLogoFile(null); setLogoPreview(null);
  };

  const handleEdit = (c: any) => {
    const cDDI = COUNTRIES.find(x => x.name === (c.country || 'Brasil'))?.ddi || '55';
    setForm({
      name: c.name || '', companyName: c.companyName || '', email: c.email || '',
      phone: c.phone || `+${cDDI} `,
      documentType: c.documentType || 'PJ',
      document: c.document ? (c.documentType === 'PF' ? maskCPF(c.document) : maskCNPJ(c.document)) : '',
      address: c.address || '', city: c.city || '', state: c.state || '',
      zipCode: c.zipCode ? maskCEP(c.zipCode) : '', country: c.country || 'Brasil',
      website: c.website || '', notes: c.notes || '',
    });
    setEditId(c.id); setContractFile(null); setLogoFile(null);
    setLogoPreview(logoPreviews[c.id] || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir o cliente "${name}"? O cliente será desativado e não aparecerá mais nas listagens.`)) return;
    try {
      await api.deleteClient(id);
      show('Cliente desativado com sucesso');
      load();
    } catch (err: any) {
      show(err.message || 'Erro ao excluir cliente', 'error');
    }
  };

  const openContract = async (contractUrl: string) => {
    try {
      const res = await api.fetch<any>(`/files/download-url?key=${encodeURIComponent(contractUrl)}`);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      }
    } catch {
      // Fallback: try direct MinIO URL
      try {
        const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || 'http://localhost:9000';
        const bucket = process.env.NEXT_PUBLIC_S3_BUCKET || 'orkestria-files';
        window.open(`${endpoint}/${bucket}/${contractUrl}`, '_blank');
      } catch {
        show('Erro ao abrir contrato', 'error');
      }
    }
  };

  const handleSavePortalAccess = async () => {
    if (!portalEditId) return;
    try {
      const data: any = {};
      if (portalForm.email.trim()) data.email = portalForm.email;
      if (portalForm.password.trim()) data.password = portalForm.password;
      if (!data.email && !data.password) { show('Preencha email ou senha', 'error'); return; }
      await api.fetch(`/clients/${portalEditId}/portal-access`, { method: 'PATCH', body: JSON.stringify(data) });
      show('Acesso ao portal atualizado');
      setPortalEditId(null);
      setPortalForm({ email: '', password: '' });
      load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold dark:text-white">Clientes</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }); }} className="btn-primary">
          <Plus size={16} className="mr-2" /> Novo Cliente
        </button>
      </div>

      {/* Portal credentials */}
      {portalInfo && (
        <div className="card mb-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-emerald-800 dark:text-emerald-300">✅ Acesso ao portal criado</h4>
            <button onClick={() => setPortalInfo(null)} className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/20"><X size={14} className="text-emerald-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-emerald-600 dark:text-emerald-400 text-xs">Login:</span><p className="font-mono font-medium text-emerald-800 dark:text-emerald-200">{portalInfo.email}</p></div>
            <div><span className="text-emerald-600 dark:text-emerald-400 text-xs">Senha:</span><p className="font-mono font-medium text-emerald-800 dark:text-emerald-200">{portalInfo.password}</p></div>
          </div>
        </div>
      )}

      {/* Contract saved */}
      {savedContractUrl && (
        <div className="card mb-6 border-[#A8CBDA] dark:border-[#1E2F3A] bg-[#EBF3F7] dark:bg-[#1E2F3A]/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#2A3F4E] dark:text-[#7BABC2]">📄 Contrato salvo com sucesso</span>
            <div className="flex gap-2">
              <button onClick={() => openContract(savedContractUrl)} className="btn-secondary text-xs"><ExternalLink size={12} className="mr-1" /> Abrir contrato</button>
              <button onClick={() => setSavedContractUrl(null)} className="p-1 rounded hover:bg-[#D6E7EF] dark:hover:bg-[#1E2F3A]/20"><X size={14} className="text-[#6B9AB8]" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Portal access edit */}
      {portalEditId && (
        <div className="card mb-6 border-[#A8CBDA] dark:border-[#1E2F3A]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium dark:text-white">Alterar acesso do portal</h4>
            <button onClick={() => setPortalEditId(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Novo email (login)</label>
              <input type="email" className="input" value={portalForm.email} onChange={e => setPortalForm(f => ({ ...f, email: e.target.value }))} placeholder="Deixe vazio para manter" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nova senha</label>
              <input type="text" className="input" value={portalForm.password} onChange={e => setPortalForm(f => ({ ...f, password: e.target.value }))} placeholder="Deixe vazio para manter" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSavePortalAccess} className="btn-primary text-sm">Salvar</button>
            <button onClick={() => setPortalEditId(null)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium dark:text-white">{editId ? 'Editar' : 'Novo'} Cliente</h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="space-y-4">

            {/* Logo + Type */}
            <div className="flex items-start gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                  {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-300" />}
                </div>
                <label className="absolute inset-0 rounded-xl cursor-pointer bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={14} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoSelect(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                <div className="flex gap-2">
                  {(['PF', 'PJ'] as const).map(t => (
                    <button key={t} type="button" onClick={() => { setField('documentType', t); setField('document', ''); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.documentType === t ? 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#7BABC2] ring-1 ring-[#7BABC2] dark:ring-[#2A3F4E]'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                      {t === 'PF' ? <User size={14} /> : <Building2 size={14} />}
                      {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{form.documentType === 'PF' ? 'Nome completo' : 'Razão social'} *</label>
                <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{form.documentType === 'PF' ? 'Apelido' : 'Nome fantasia'}</label>
                <input className="input" value={form.companyName} onChange={e => setField('companyName', e.target.value)} />
              </div>
            </div>

            {/* Doc + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{form.documentType === 'PF' ? 'CPF' : 'CNPJ'}</label>
                <input className="input" value={form.document}
                  onChange={e => setField('document', form.documentType === 'PF' ? maskCPF(e.target.value) : maskCNPJ(e.target.value))}
                  placeholder={form.documentType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input className="input" value={form.phone}
                  onChange={e => setField('phone', maskPhone(e.target.value, currentDDI))}
                  placeholder={`+${currentDDI}`} />
              </div>
            </div>

            {/* Email + Website */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setField('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input className="input" value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://" />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Globe size={12} className="inline mr-1" />País</label>
              <select className="input" value={form.country} onChange={e => handleCountryChange(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name} (+{c.ddi})</option>)}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
              <input className="input" value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Rua, número, complemento" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isBrazil && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                  <input className="input" value={form.zipCode} onChange={e => handleCEPChange(e.target.value)} placeholder="00000-000" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                <input className="input" value={form.city} onChange={e => setField('city', e.target.value)} />
              </div>
              {isBrazil ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                  <select className="input" value={form.state} onChange={e => setField('state', e.target.value)}>
                    <option value="">UF</option>
                    {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Região / Código postal</label>
                  <input className="input" value={form.state} onChange={e => setField('state', e.target.value)} placeholder="Região" />
                </div>
              )}
            </div>

            {/* Contract PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contrato (PDF)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-[#6B9AB8] cursor-pointer transition-colors">
                  <Upload size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{contractFile ? contractFile.name : 'Selecionar PDF'}</span>
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => setContractFile(e.target.files?.[0] || null)} />
                </label>
                {contractFile && <button onClick={() => setContractFile(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} className="text-gray-400" /></button>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
              <textarea className="input min-h-[60px]" value={form.notes} onChange={e => setField('notes', e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="btn-primary" disabled={uploading}>{uploading ? 'Salvando...' : editId ? 'Salvar' : 'Criar cliente'}</button>
              <button onClick={closeForm} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST ── */}
      {!clients ? <p className="text-gray-400 text-sm">Carregando...</p> : clients.data?.length === 0 ? (
        <div className="card text-center py-12"><Building2 size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" /><p className="text-gray-400 dark:text-gray-500">Nenhum cliente</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.data.map((c: any) => {
            const flag = COUNTRIES.find(x => x.name === c.country)?.flag || '🌐';
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${
                      c.logoUrl ? '' : c.documentType === 'PF' ? 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30' : 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30'
                    }`}>
                      {logoPreviews[c.id] ? <img src={logoPreviews[c.id]} className="w-full h-full object-cover" />
                        : c.documentType === 'PF' ? <User size={18} className="text-[#3A6280] dark:text-[#6B9AB8]" />
                        : <Building2 size={18} className="text-[#3A6280] dark:text-[#6B9AB8]" />}
                    </div>
                    <div>
                      <h3 className="font-medium dark:text-white">{c.name}</h3>
                      {c.companyName && <p className="text-xs text-gray-400">{c.companyName}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={14} className="text-gray-400" /></button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-400" /></button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  {c.document && <p className="font-mono text-xs">{c.documentType === 'PF' ? 'CPF' : 'CNPJ'}: {c.documentType === 'PF' ? maskCPF(c.document) : maskCNPJ(c.document)}</p>}
                  {c.email && <p>{c.email}</p>}
                  {c.phone && <p>{c.phone}</p>}
                  {c.city && <p>{flag} {c.city}{c.state ? `/${c.state}` : ''}{c.country && c.country !== 'Brasil' ? ` — ${c.country}` : ''}</p>}
                  {c.clientUsers?.[0]?.user?.email && (
                    <p className="text-xs mt-1"><span className="text-gray-400">Portal: </span><span className="text-[#3A6280] dark:text-[#6B9AB8] font-mono">{c.clientUsers[0].user.email}</span></p>
                  )}
                  {c.contractUrl && (
                    <button onClick={() => openContract(c.contractUrl)} className="flex items-center gap-1 text-[#3A6280] dark:text-[#6B9AB8] text-xs mt-2 hover:underline">
                      <FileText size={12} /> Abrir contrato <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
