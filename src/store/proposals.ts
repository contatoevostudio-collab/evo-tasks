import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Proposal, ProposalService, PricingOption, BentoSlot } from '../types';

const uid = () => Math.random().toString(36).slice(2, 10);
const token = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

const makeBentoSlots = (): BentoSlot[] =>
  Array.from({ length: 7 }, () => ({ id: uid() }));

export function getDefaultPricingOptions(service: ProposalService): PricingOption[] {
  const o = (name: string, subtitle: string, items: string[], full: number, disc: number, mostSold = false, hl = true): PricingOption =>
    ({ id: uid(), name, subtitle, items, fullPrice: full, discountedPrice: disc, isMostSold: mostSold, isHighlighted: hl });

  if (service === 'identidade-visual') return [
    o('Logotipo', 'Simples', ['Símbolo (PNG)', 'Letreiro (PNG)', 'Paleta de cores', 'Apresentação simples', 'Versões vetoriais (.ai, eps, PDF)'], 697, 497),
    o('Identidade Visual', 'Completa', ['Logo, símbolo e letreiro', 'Versões responsivas', 'Versões em PNG', 'Aplicações', 'Paleta de cores', 'Grafismo e Pattern', 'Versões vetoriais (.ai, eps, PDF)', 'Manual de uso e de marca', 'Destaques para Instagram'], 1997, 1397, true),
    o('Identidade Visual', 'Simplificada', ['Logo, símbolo e letreiro', 'Versões responsivas', 'Versões em PNG', 'Aplicações', 'Paleta de cores', 'Versões vetoriais (.ai, eps, PDF)', 'Manual de uso simples'], 1187, 797),
  ];

  if (service === 'logo') return [
    o('Logo', 'Simples', ['Símbolo (PNG)', 'Letreiro (PNG)', 'Paleta de cores', 'Apresentação simples'], 497, 297),
    o('Logo', 'Profissional', ['Logo, símbolo e letreiro', 'Versões responsivas', 'Versões em PNG', 'Paleta de cores', 'Versões vetoriais (.ai, eps, PDF)'], 797, 597, true),
  ];

  if (service === 'social-media') return [
    o('Social Media', 'Starter', ['8 posts/mês', 'Stories semanais', 'Gestão de feed', 'Relatório mensal'], 997, 797),
    o('Social Media', 'Growth', ['16 posts/mês', 'Stories diários', 'Reels mensais', 'Gestão de feed', 'Relatório mensal'], 1497, 1197, true),
    o('Social Media', 'Pro', ['20+ posts/mês', 'Stories diários', 'Reels semanais', 'Tráfego Pago', 'Gestão completa', 'Relatório mensal'], 2497, 1997),
  ];

  if (service === 'site') return [
    o('Landing Page', 'Simples', ['Design personalizado', 'Responsivo mobile', 'SEO básico', '1 revisão incluída'], 1497, 997),
    o('Site', 'Institucional', ['Design personalizado', 'Até 5 páginas', 'Responsivo mobile', 'SEO completo', '2 revisões incluídas'], 2997, 2397, true),
    o('E-commerce', 'Completo', ['Design personalizado', 'Catálogo de produtos', 'Carrinho + pagamentos', 'SEO completo', 'Painel admin'], 4997, 3997),
  ];

  if (service === 'estrategia') return [
    o('Diagnóstico', 'Estratégico', ['Análise de marca', 'Relatório estratégico', 'Plano de ação 30 dias', '1 sessão de alinhamento'], 997, 797),
    o('Mentoria', 'Mensal', ['4 sessões mensais', 'Estratégia de conteúdo', 'Análise de métricas', 'Acompanhamento WhatsApp'], 1997, 1497, true),
  ];

  return [];
}

interface ProposalsStore {
  proposals: Proposal[];
  addProposal(p: Pick<Proposal, 'clientName' | 'service' | 'validity' | 'status' | 'theme'>): Proposal;
  updateProposal(id: string, updates: Partial<Proposal>): void;
  deleteProposal(id: string): void;
}

export const useProposalsStore = create<ProposalsStore>()(
  persist(
    (set) => ({
      proposals: [],

      addProposal: (p) => {
        const full: Proposal = {
          ...p,
          id: uid(),
          shareToken: token(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          portfolio1: { title: 'Identidade Visual', subtitle: 'Projeto 1', slots: makeBentoSlots() },
          portfolio2: { title: 'Identidade Visual', subtitle: 'Projeto 2', slots: makeBentoSlots() },
          pricingHeadline: 'Um investimento para oportunidades maiores',
          pricingOptions: getDefaultPricingOptions(p.service),
          alteracaoEsboco: 30,
          alteracaoCor: 20,
        };
        set(s => ({ proposals: [full, ...s.proposals] }));
        return full;
      },

      updateProposal: (id, updates) => {
        set(s => ({
          proposals: s.proposals.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProposal: (id) => {
        set(s => ({ proposals: s.proposals.filter(p => p.id !== id) }));
      },
    }),
    { name: 'evo-proposals-storage' }
  )
);
