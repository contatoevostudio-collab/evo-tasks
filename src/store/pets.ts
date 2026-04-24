import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './auth';
import { syncPet, deletePet } from '../lib/supabaseSync';

export type PetClass = 'mago' | 'arqueiro' | 'barbaro' | 'guerreiro' | 'shaman';

export interface ActivePet {
  class: PetClass;
  name: string;
  level: number;
  exp: number;
  battlesWon: number;
  battlesLost: number;
}

export interface PetStats {
  maxHp: number;
  atk: number;
  def: number;
  int: number;
  dex: number;
}

export type AttackType = 'physical' | 'magic' | 'special' | 'buff';

export interface AttackEffect {
  type: 'stun' | 'burn' | 'boost_atk' | 'boost_def' | 'heal' | 'debuff_atk';
  turns?: number;
  multiplier?: number;
  healPercent?: number;
  burnDamage?: number;
}

export interface PetAttack {
  name: string;
  unlockLevel: number;
  type: AttackType;
  power: number;
  icon: string;
  effect?: AttackEffect;
  guaranteedCrit?: boolean;
  ignoreDefense?: boolean;
}

type BaseStatRecord = { hp: number; atk: number; def: number; int: number; dex: number };

export const BASE_STATS: Record<PetClass, BaseStatRecord> = {
  mago:     { hp: 60,  atk: 35, def: 25, int: 90, dex: 50 },
  arqueiro: { hp: 75,  atk: 60, def: 35, int: 50, dex: 95 },
  barbaro:  { hp: 130, atk: 80, def: 45, int: 20, dex: 35 },
  guerreiro:{ hp: 100, atk: 90, def: 75, int: 30, dex: 40 },
  shaman:   { hp: 80,  atk: 50, def: 40, int: 80, dex: 60 },
};

export const STAT_GROWTH: Record<PetClass, BaseStatRecord> = {
  mago:     { hp: 3, atk: 1, def: 1, int: 4, dex: 2 },
  arqueiro: { hp: 4, atk: 3, def: 1, int: 1, dex: 4 },
  barbaro:  { hp: 8, atk: 3, def: 2, int: 0, dex: 1 },
  guerreiro:{ hp: 5, atk: 4, def: 4, int: 0, dex: 1 },
  shaman:   { hp: 4, atk: 2, def: 2, int: 3, dex: 3 },
};

export const ATTACKS: Record<PetClass, PetAttack[]> = {
  mago: [
    { name: 'Magia Básica',    unlockLevel: 1,  type: 'magic',   power: 1.2, icon: '✨' },
    { name: 'Feitiço de Gelo', unlockLevel: 5,  type: 'magic',   power: 1.8, icon: '❄️', effect: { type: 'stun', turns: 1 } },
    { name: 'Relâmpago',       unlockLevel: 10, type: 'magic',   power: 2.5, icon: '⚡' },
    { name: 'Meteoro',         unlockLevel: 20, type: 'special', power: 4.0, icon: '☄️' },
  ],
  arqueiro: [
    { name: 'Flechada',        unlockLevel: 1,  type: 'physical', power: 1.3, icon: '🏹' },
    { name: 'Chuva de Flechas',unlockLevel: 5,  type: 'physical', power: 1.6, icon: '🎯' },
    { name: 'Flecha Venenosa', unlockLevel: 10, type: 'special',  power: 1.4, icon: '☠️', effect: { type: 'burn', turns: 3, burnDamage: 8 } },
    { name: 'Tiro Perfeito',   unlockLevel: 20, type: 'special',  power: 3.5, icon: '💥', guaranteedCrit: true },
  ],
  barbaro: [
    { name: 'Golpe Bruto',     unlockLevel: 1,  type: 'physical', power: 1.4, icon: '🪓' },
    { name: 'Fúria',           unlockLevel: 5,  type: 'buff',     power: 0,   icon: '😤', effect: { type: 'boost_atk', turns: 3, multiplier: 1.5 } },
    { name: 'Espiral do Caos', unlockLevel: 10, type: 'physical', power: 2.2, icon: '🌀' },
    { name: 'Devastar',        unlockLevel: 20, type: 'special',  power: 4.5, icon: '💢', ignoreDefense: true },
  ],
  guerreiro: [
    { name: 'Golpe de Espada', unlockLevel: 1,  type: 'physical', power: 1.3, icon: '⚔️' },
    { name: 'Defender',        unlockLevel: 5,  type: 'buff',     power: 0,   icon: '🛡️', effect: { type: 'boost_def', turns: 2, multiplier: 1.8 } },
    { name: 'Contra-Ataque',   unlockLevel: 10, type: 'special',  power: 2.0, icon: '🔄' },
    { name: 'Lâmina Sagrada',  unlockLevel: 20, type: 'special',  power: 3.8, icon: '✝️' },
  ],
  shaman: [
    { name: 'Feitiço da Terra',    unlockLevel: 1,  type: 'magic',  power: 1.1, icon: '🌿' },
    { name: 'Cura Natural',         unlockLevel: 5,  type: 'buff',   power: 0,   icon: '💚', effect: { type: 'heal', healPercent: 0.25 } },
    { name: 'Maldição',             unlockLevel: 10, type: 'special', power: 0,  icon: '👁️', effect: { type: 'debuff_atk', turns: 2, multiplier: 0.7 } },
    { name: 'Tempestade Espiritual',unlockLevel: 20, type: 'magic',  power: 3.5, icon: '🌪️' },
  ],
};

export const CLASS_CONFIG: Record<PetClass, { label: string; color: string; accent: string; icon: string; description: string; primaryStat: string }> = {
  mago:     { label: 'Mago',      color: '#8B5CF6', accent: '#C4B5FD', icon: '🧙',  description: 'Mestre das artes arcanas',         primaryStat: 'INT' },
  arqueiro: { label: 'Arqueiro',  color: '#22C55E', accent: '#86EFAC', icon: '🏹',  description: 'Velocidade e precisão letais',      primaryStat: 'DEX' },
  barbaro:  { label: 'Bárbaro',   color: '#EF4444', accent: '#FCA5A5', icon: '🪓',  description: 'Força bruta imparável',             primaryStat: 'HP' },
  guerreiro:{ label: 'Guerreiro', color: '#3B82F6', accent: '#93C5FD', icon: '⚔️', description: 'Equilíbrio entre ataque e defesa',  primaryStat: 'ATK' },
  shaman:   { label: 'Xamã',      color: '#F59E0B', accent: '#FCD34D', icon: '🌿',  description: 'Buffs e magia da natureza',         primaryStat: 'INT+DEX' },
};

export function computeStats(pet: ActivePet): PetStats {
  const base = BASE_STATS[pet.class];
  const growth = STAT_GROWTH[pet.class];
  const lvl = Math.max(0, pet.level - 1);
  return {
    maxHp: base.hp  + growth.hp  * lvl,
    atk:   base.atk + growth.atk * lvl,
    def:   base.def + growth.def * lvl,
    int:   base.int + growth.int * lvl,
    dex:   base.dex + growth.dex * lvl,
  };
}

export function getEvolution(level: number): 1 | 2 | 3 {
  if (level >= 21) return 3;
  if (level >= 11) return 2;
  return 1;
}

export function expToNextLevel(level: number): number {
  return level * 60;
}

interface PetsStore {
  activePet: ActivePet | null;
  tasksXpClaimed: number;
  ideasXpClaimed: number;

  choosePet(cls: PetClass, name: string): void;
  abandonPet(): void;
  addExp(amount: number): void;
  claimTasksXp(newCount: number): void;
  claimIdeasXp(newCount: number): void;
  renamePet(name: string): void;
  loadFromDb(row: Record<string, unknown>): void;
}

export const usePetsStore = create<PetsStore>()(
  persist(
    (set, get) => ({
      activePet: null,
      tasksXpClaimed: 0,
      ideasXpClaimed: 0,

      choosePet: (cls, name) => {
        const pet: ActivePet = {
          class: cls,
          name: name.trim() || CLASS_CONFIG[cls].label,
          level: 1,
          exp: 0,
          battlesWon: 0,
          battlesLost: 0,
        };
        set({ activePet: pet });
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncPet(pet, userId, get().tasksXpClaimed, get().ideasXpClaimed).catch(console.error);
      },

      abandonPet: () => {
        const userId = useAuthStore.getState().user?.id;
        set({ activePet: null });
        if (userId) deletePet(userId).catch(console.error);
      },

      addExp: (amount) => {
        const { activePet } = get();
        if (!activePet) return;
        const MAX_LEVEL = 30;
        let { level, exp } = activePet;
        exp += amount;
        while (level < MAX_LEVEL) {
          const needed = expToNextLevel(level);
          if (exp >= needed) {
            exp -= needed;
            level += 1;
          } else {
            break;
          }
        }
        if (level >= MAX_LEVEL) exp = 0;
        const updated = { ...activePet, level, exp };
        set({ activePet: updated });
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncPet(updated, userId, get().tasksXpClaimed, get().ideasXpClaimed).catch(console.error);
      },

      claimTasksXp: (newCount) => {
        const { tasksXpClaimed } = get();
        const diff = newCount - tasksXpClaimed;
        if (diff <= 0) return;
        set({ tasksXpClaimed: newCount });
        get().addExp(diff * 8);
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const { activePet, ideasXpClaimed } = get(); if (activePet) syncPet(activePet, userId, newCount, ideasXpClaimed).catch(console.error); }
      },

      claimIdeasXp: (newCount) => {
        const { ideasXpClaimed } = get();
        const diff = newCount - ideasXpClaimed;
        if (diff <= 0) return;
        set({ ideasXpClaimed: newCount });
        get().addExp(diff * 5);
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const { activePet, tasksXpClaimed } = get(); if (activePet) syncPet(activePet, userId, tasksXpClaimed, newCount).catch(console.error); }
      },

      renamePet: (name) => {
        const { activePet } = get();
        if (!activePet) return;
        const renamed = { ...activePet, name: name.trim() || activePet.name };
        set({ activePet: renamed });
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncPet(renamed, userId, get().tasksXpClaimed, get().ideasXpClaimed).catch(console.error);
      },

      loadFromDb: (row) => {
        set({
          activePet: {
            class: row.class as ActivePet['class'],
            name: row.name as string,
            level: row.level as number,
            exp: row.exp as number,
            battlesWon: row.battles_won as number,
            battlesLost: row.battles_lost as number,
          },
          tasksXpClaimed: (row.tasks_xp_claimed as number) || 0,
          ideasXpClaimed: (row.ideas_xp_claimed as number) || 0,
        });
      },
    }),
    { name: 'evo-pets-store' }
  )
);
