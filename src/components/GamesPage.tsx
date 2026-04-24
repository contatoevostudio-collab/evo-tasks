import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetsStore, CLASS_CONFIG, BASE_STATS, STAT_GROWTH, ATTACKS, computeStats, getEvolution, expToNextLevel } from '../store/pets';
import type { PetClass, ActivePet, PetAttack, PetStats } from '../store/pets';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore } from '../store/ideas';

// ─── Stat bar colours ────────────────────────────────────────────────────────
const STAT_COLORS: Record<string, string> = {
  maxHp: '#EF4444',
  atk:   '#F97316',
  def:   '#3B82F6',
  int:   '#8B5CF6',
  dex:   '#22C55E',
};
const STAT_LABELS: Record<string, string> = { maxHp: 'HP', atk: 'ATK', def: 'DEF', int: 'INT', dex: 'DEX' };

// ─── Max possible stats (for bar scaling) ────────────────────────────────────
function maxPossibleStat(statKey: keyof typeof BASE_STATS.mago): number {
  const classes: PetClass[] = ['mago', 'arqueiro', 'barbaro', 'guerreiro', 'shaman'];
  let max = 0;
  for (const cls of classes) {
    const val = BASE_STATS[cls][statKey] + STAT_GROWTH[cls][statKey] * 29;
    if (val > max) max = val;
  }
  return max;
}

const MAX_STATS = {
  maxHp: maxPossibleStat('hp'),
  atk:   maxPossibleStat('atk'),
  def:   maxPossibleStat('def'),
  int:   maxPossibleStat('int'),
  dex:   maxPossibleStat('dex'),
};

// ─── Battle types ─────────────────────────────────────────────────────────────
interface BattleFighter {
  name: string;
  cls: PetClass;
  stats: PetStats;
  currentHp: number;
  level: number;
  atkBuff: number;
  defBuff: number;
  atkBuffTurns: number;
  defBuffTurns: number;
  burnTurns: number;
  burnDamage: number;
  stunTurns: number;
}

interface BattleLogEntry {
  id: number;
  text: string;
  type: 'player' | 'enemy' | 'system' | 'heal' | 'buff';
}

interface FloatingNumber {
  id: number;
  value: number;
  isPlayer: boolean;
  isCrit?: boolean;
}

// ─── Pet Selection Screen ─────────────────────────────────────────────────────
function PetSelectionScreen() {
  const { choosePet } = usePetsStore();
  const [selected, setSelected] = useState<PetClass | null>(null);
  const [petName, setPetName] = useState('');
  const classes: PetClass[] = ['mago', 'arqueiro', 'barbaro', 'guerreiro', 'shaman'];

  const canStart = selected !== null && petName.trim().length > 0;

  function getStatPreviewBars(cls: PetClass) {
    const base = BASE_STATS[cls];
    const stats = [
      { key: 'hp',  label: 'HP',  value: base.hp,  max: 130, color: '#EF4444' },
      { key: 'atk', label: 'ATK', value: base.atk, max: 90,  color: '#F97316' },
      { key: 'def', label: 'DEF', value: base.def, max: 75,  color: '#3B82F6' },
      { key: 'int', label: 'INT', value: base.int, max: 90,  color: '#8B5CF6' },
      { key: 'dex', label: 'DEX', value: base.dex, max: 95,  color: '#22C55E' },
    ];
    return stats;
  }

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '24px 24px 32px' }}>
      {/* Empty-state hero */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '20px 24px 24px', marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(191,90,242,0.08), rgba(53,107,255,0.04))',
        borderRadius: 16, border: '1px solid var(--b2)',
        maxWidth: 880, marginLeft: 'auto', marginRight: 'auto',
      }}>
        <div style={{ fontSize: 48, lineHeight: 1, opacity: 0.85 }}>🎮</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', textAlign: 'center', letterSpacing: '-0.3px' }}>
          Escolha seu companheiro
        </div>
        <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 420, lineHeight: 1.5 }}>
          Seu pet cresce com a sua produtividade — cada tarefa concluída rende XP, cada ideia capturada também conta
        </div>
      </div>

      {/* Pet cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        maxWidth: 880,
        margin: '0 auto 32px',
      }}>
        {classes.map(cls => {
          const cfg = CLASS_CONFIG[cls];
          const isSelected = selected === cls;
          const bars = getStatPreviewBars(cls);

          return (
            <motion.div
              key={cls}
              onClick={() => setSelected(cls)}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}10)`
                  : 'var(--s1)',
                border: `1.5px solid ${isSelected ? cfg.color : 'var(--b2)'}`,
                borderRadius: 16,
                padding: '20px 16px',
                cursor: 'pointer',
                boxShadow: isSelected ? `0 0 20px ${cfg.color}40, 0 4px 12px rgba(0,0,0,0.2)` : '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                userSelect: 'none',
              }}
            >
              {/* Icon */}
              <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 10, lineHeight: 1 }}>
                {cfg.icon}
              </div>

              {/* Name */}
              <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: isSelected ? cfg.accent : 'var(--t1)', marginBottom: 4 }}>
                {cfg.label}
              </div>

              {/* Description */}
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.4 }}>
                {cfg.description}
              </div>

              {/* Primary stat badge */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                  color: cfg.color,
                  background: `${cfg.color}18`,
                  border: `1px solid ${cfg.color}44`,
                  borderRadius: 6,
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                }}>
                  {cfg.primaryStat}
                </span>
              </div>

              {/* Stat bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {bars.map(bar => (
                  <div key={bar.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: bar.color, width: 22, textAlign: 'right', flexShrink: 0 }}>
                      {bar.label}
                    </span>
                    <div style={{ flex: 1, height: 4, background: 'var(--b1)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(bar.value / bar.max) * 100}%`,
                        height: '100%',
                        background: bar.color,
                        borderRadius: 99,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Name input + Start button */}
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ width: '100%' }}>
          <input
            type="text"
            value={petName}
            onChange={e => setPetName(e.target.value)}
            placeholder={selected ? `Nome para ${CLASS_CONFIG[selected].label}...` : 'Escolha uma classe primeiro...'}
            maxLength={24}
            disabled={!selected}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--ib)', border: '1.5px solid var(--b2)',
              color: 'var(--t1)', fontSize: 14, outline: 'none',
              opacity: selected ? 1 : 0.5,
              transition: 'border-color 0.15s, opacity 0.15s',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = selected ? CLASS_CONFIG[selected!].color : 'var(--b3)'; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--b2)'; }}
            onKeyDown={e => { if (e.key === 'Enter' && canStart) choosePet(selected!, petName); }}
          />
        </div>

        <motion.button
          onClick={() => canStart && choosePet(selected!, petName)}
          disabled={!canStart}
          whileHover={canStart ? { scale: 1.04 } : {}}
          whileTap={canStart ? { scale: 0.97 } : {}}
          style={{
            padding: '11px 32px', borderRadius: 12,
            background: canStart && selected
              ? `linear-gradient(135deg, ${CLASS_CONFIG[selected!].color}, ${CLASS_CONFIG[selected!].accent}88)`
              : 'var(--s2)',
            border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
            color: canStart ? '#fff' : 'var(--t4)',
            fontSize: 14, fontWeight: 700,
            boxShadow: canStart && selected ? `0 4px 16px ${CLASS_CONFIG[selected!].color}50` : 'none',
            transition: 'all 0.15s',
          }}
        >
          ⚔️ Começar Aventura
        </motion.button>
      </div>
    </div>
  );
}

// ─── Stat Bar component ────────────────────────────────────────────────────────
function StatBar({ statKey, value, animated }: { statKey: string; value: number; animated?: boolean }) {
  const maxVal = MAX_STATS[statKey as keyof typeof MAX_STATS] ?? 200;
  const pct = Math.min(100, (value / maxVal) * 100);
  const color = STAT_COLORS[statKey] ?? '#fff';
  const label = STAT_LABELS[statKey] ?? statKey.toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color, width: 28, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--b1)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 99 }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--t2)', width: 32, textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

// ─── HP Bar component ─────────────────────────────────────────────────────────
function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div style={{ width: '100%', height: 8, background: 'var(--b1)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ height: '100%', background: color, borderRadius: 99 }}
      />
    </div>
  );
}

// ─── Exp Bar component ────────────────────────────────────────────────────────
function ExpBar({ exp, level }: { exp: number; level: number }) {
  const needed = expToNextLevel(level);
  const pct = level >= 30 ? 100 : Math.min(100, (exp / needed) * 100);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--t4)' }}>EXP</span>
        <span style={{ fontSize: 10, color: 'var(--t4)' }}>
          {level >= 30 ? 'MAX' : `${exp} / ${needed}`}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--b1)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #356BFF, #64C4FF)', borderRadius: 99 }}
        />
      </div>
    </div>
  );
}

// ─── Battle Arena ────────────────────────────────────────────────────────────
function createFighter(pet: ActivePet): BattleFighter {
  const stats = computeStats(pet);
  return {
    name: pet.name,
    cls: pet.class,
    stats,
    currentHp: stats.maxHp,
    level: pet.level,
    atkBuff: 1, defBuff: 1,
    atkBuffTurns: 0, defBuffTurns: 0,
    burnTurns: 0, burnDamage: 0,
    stunTurns: 0,
  };
}

function createAiFighter(playerLevel: number): BattleFighter {
  const classes: PetClass[] = ['mago', 'arqueiro', 'barbaro', 'guerreiro', 'shaman'];
  const cls = classes[Math.floor(Math.random() * classes.length)];
  const levelDelta = Math.floor(Math.random() * 7) - 3;
  const level = Math.max(1, Math.min(30, playerLevel + levelDelta));
  const fakePet: ActivePet = { class: cls, name: CLASS_CONFIG[cls].label, level, exp: 0, battlesWon: 0, battlesLost: 0 };
  return createFighter(fakePet);
}

function calcDamage(attacker: BattleFighter, defender: BattleFighter, attack: PetAttack, forceCrit = false): { damage: number; isCrit: boolean } {
  const isCrit = forceCrit || Math.random() < 0.12;
  const variance = 0.85 + Math.random() * 0.3;
  const critMult = isCrit ? 1.5 : 1;
  const atkStat = attack.type === 'magic' ? attacker.stats.int : attacker.stats.atk;
  const effAtk = atkStat * attacker.atkBuff;
  const effDef = attack.ignoreDefense ? 0 : defender.stats.def * defender.defBuff * 0.4;
  const raw = Math.floor(effAtk * attack.power * variance * critMult - Math.max(0, effDef));
  return { damage: Math.max(1, raw), isCrit };
}

interface BattleArenaProps {
  player: BattleFighter;
  enemy: BattleFighter;
  playerAttacks: PetAttack[];
  onAction: (attack: PetAttack) => void;
  onFlee: () => void;
  battleLog: BattleLogEntry[];
  floatingNums: FloatingNumber[];
  playerShake: boolean;
  enemyShake: boolean;
  playerFlash: boolean;
  enemyFlash: boolean;
  battleOver: boolean;
  winner: 'player' | 'enemy' | null;
  playerClass: PetClass;
  isEnemyTurn: boolean;
}

function BattleArena({
  player, enemy, playerAttacks, onAction, onFlee,
  battleLog, floatingNums, playerShake, enemyShake,
  playerFlash, enemyFlash, battleOver, winner,
  playerClass, isEnemyTurn,
}: BattleArenaProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const playerCfg = CLASS_CONFIG[playerClass];
  const enemyCfg = CLASS_CONFIG[enemy.cls];

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleLog]);

  const logColors: Record<string, string> = {
    player: playerCfg.accent,
    enemy: enemyCfg.accent,
    system: 'var(--t3)',
    heal: '#22C55E',
    buff: '#F59E0B',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', gap: 12,
      padding: '16px 16px 8px',
    }}>
      {/* Enemy row */}
      <div style={{
        background: `linear-gradient(135deg, ${enemyCfg.color}15, var(--s1))`,
        border: `1px solid ${enemyCfg.color}44`,
        borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <motion.div
          animate={enemyShake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
          style={{ position: 'relative' }}
        >
          <motion.div
            animate={enemyFlash ? { filter: ['brightness(1)', 'brightness(3)', 'brightness(1)'] } : {}}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 36, lineHeight: 1 }}
          >
            {enemyCfg.icon}
          </motion.div>
          {floatingNums.filter(f => !f.isPlayer).map(f => (
            <motion.div key={f.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                fontSize: f.isCrit ? 16 : 13,
                fontWeight: 800, color: f.isCrit ? '#FFD700' : '#EF4444',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none', whiteSpace: 'nowrap',
              }}
            >
              -{f.value}{f.isCrit ? '!' : ''}
            </motion.div>
          ))}
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{enemy.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: enemyCfg.color, background: `${enemyCfg.color}20`, padding: '1px 7px', borderRadius: 99 }}>
              LV {enemy.level}
            </span>
          </div>
          <HpBar current={enemy.currentHp} max={enemy.stats.maxHp} color={enemyCfg.color} />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>
            {enemy.currentHp} / {enemy.stats.maxHp} HP
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div
        ref={logRef}
        style={{
          flex: 1, overflowY: 'auto', background: 'var(--s1)',
          borderRadius: 12, padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 4,
          minHeight: 0,
        }}
      >
        {battleLog.map(entry => (
          <div key={entry.id} style={{ fontSize: 12, color: logColors[entry.type] ?? 'var(--t3)', lineHeight: 1.5 }}>
            {entry.text}
          </div>
        ))}
      </div>

      {/* Player row */}
      <div style={{
        background: `linear-gradient(135deg, ${playerCfg.color}15, var(--s1))`,
        border: `1px solid ${playerCfg.color}44`,
        borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <motion.div
          animate={playerShake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
          style={{ position: 'relative' }}
        >
          <motion.div
            animate={playerFlash ? { filter: ['brightness(1)', 'brightness(3)', 'brightness(1)'] } : {}}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 36, lineHeight: 1 }}
          >
            {playerCfg.icon}
          </motion.div>
          {floatingNums.filter(f => f.isPlayer).map(f => (
            <motion.div key={f.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                fontSize: f.isCrit ? 16 : 13,
                fontWeight: 800, color: f.isCrit ? '#FFD700' : '#EF4444',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none', whiteSpace: 'nowrap',
              }}
            >
              -{f.value}{f.isCrit ? '!' : ''}
            </motion.div>
          ))}
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{player.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: playerCfg.color, background: `${playerCfg.color}20`, padding: '1px 7px', borderRadius: 99 }}>
              LV {player.level}
            </span>
          </div>
          <HpBar current={player.currentHp} max={player.stats.maxHp} color={playerCfg.color} />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>
            {player.currentHp} / {player.stats.maxHp} HP
          </div>
        </div>
      </div>

      {/* Attack buttons or result */}
      {!battleOver ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {playerAttacks.map(atk => (
            <button
              key={atk.name}
              onClick={() => !isEnemyTurn && onAction(atk)}
              disabled={isEnemyTurn}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: `${CLASS_CONFIG[playerClass].color}22`,
                border: `1px solid ${CLASS_CONFIG[playerClass].color}55`,
                color: isEnemyTurn ? 'var(--t4)' : CLASS_CONFIG[playerClass].accent,
                fontSize: 12, fontWeight: 600, cursor: isEnemyTurn ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', opacity: isEnemyTurn ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!isEnemyTurn) (e.currentTarget as HTMLElement).style.background = `${CLASS_CONFIG[playerClass].color}40`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${CLASS_CONFIG[playerClass].color}22`; }}
            >
              <span>{atk.icon}</span>
              <span>{atk.name}</span>
            </button>
          ))}
          <button
            onClick={onFlee}
            style={{
              marginLeft: 'auto', padding: '8px 14px', borderRadius: 10,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; }}
          >
            🏃 Fugir
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            textAlign: 'center', padding: '12px',
            background: winner === 'player'
              ? 'rgba(34,197,94,0.12)'
              : 'rgba(239,68,68,0.12)',
            border: `1px solid ${winner === 'player' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>{winner === 'player' ? '🏆' : '💀'}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: winner === 'player' ? '#22C55E' : '#EF4444', marginBottom: 4 }}>
            {winner === 'player' ? 'Vitória!' : 'Derrota...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            {winner === 'player' ? '+50 XP ganhos!' : 'Treine mais e tente novamente.'}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Pet Game Screen ────────────────────────────────────────────────────────
function PetGameScreen({ pet }: { pet: ActivePet }) {
  const { addExp, abandonPet, renamePet, claimTasksXp, claimIdeasXp, tasksXpClaimed, ideasXpClaimed } = usePetsStore();
  const { tasks } = useTaskStore();
  const { ideas } = useIdeasStore();

  const [activeTab, setActiveTab] = useState<'pet' | 'battle'>('pet');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(pet.name);
  const [levelUpFlash, setLevelUpFlash] = useState(false);
  const prevLevelRef = useRef(pet.level);

  // Battle state
  const [_battleMode, setBattleMode] = useState<'none' | 'ia' | 'amigo'>('none');
  const [pvpCode, setPvpCode] = useState('');
  const [pvpOpponentCode, setPvpOpponentCode] = useState('');
  const [pvpCopied, setPvpCopied] = useState(false);
  const [pvpParseError, setPvpParseError] = useState('');

  // Active battle state
  const [inBattle, setInBattle] = useState(false);
  const [playerFighter, setPlayerFighter] = useState<BattleFighter | null>(null);
  const [enemyFighter, setEnemyFighter] = useState<BattleFighter | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [floatingNums, setFloatingNums] = useState<FloatingNumber[]>([]);
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [battleOver, setBattleOver] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'player' | 'enemy' | null>(null);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const logCounter = useRef(0);
  const floatCounter = useRef(0);

  const stats = computeStats(pet);
  const evo = getEvolution(pet.level);
  const cfg = CLASS_CONFIG[pet.class];
  const evoSize = evo === 3 ? 120 : evo === 2 ? 100 : 80;

  // Check unclaimed XP
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const ideasCount = ideas.length;
  const unclaimedTaskXp = Math.max(0, doneTasks - tasksXpClaimed) * 8;
  const unclaimedIdeasXp = Math.max(0, ideasCount - ideasXpClaimed) * 5;
  const totalUnclaimedXp = unclaimedTaskXp + unclaimedIdeasXp;

  // Level-up detection
  useEffect(() => {
    if (pet.level > prevLevelRef.current) {
      setLevelUpFlash(true);
      setTimeout(() => setLevelUpFlash(false), 1200);
      prevLevelRef.current = pet.level;
    }
  }, [pet.level]);

  // Generate PvP export code
  useEffect(() => {
    const data = { class: pet.class, name: pet.name, level: pet.level, stats };
    setPvpCode(btoa(JSON.stringify(data)));
  }, [pet]);

  function handleClaimXp() {
    claimTasksXp(doneTasks);
    claimIdeasXp(ideasCount);
  }

  function handleCopyPvpCode() {
    navigator.clipboard.writeText(pvpCode).then(() => {
      setPvpCopied(true);
      setTimeout(() => setPvpCopied(false), 2000);
    });
  }

  function addLog(text: string, type: BattleLogEntry['type']) {
    logCounter.current += 1;
    setBattleLog(prev => [...prev.slice(-30), { id: logCounter.current, text, type }]);
  }

  function addFloating(value: number, isPlayer: boolean, isCrit = false) {
    floatCounter.current += 1;
    const id = floatCounter.current;
    setFloatingNums(prev => [...prev, { id, value, isPlayer, isCrit }]);
    setTimeout(() => setFloatingNums(prev => prev.filter(f => f.id !== id)), 900);
  }

  function startBattleIa() {
    const pf = createFighter(pet);
    const ef = createAiFighter(pet.level);
    setPlayerFighter(pf);
    setEnemyFighter(ef);
    setBattleLog([]);
    setBattleOver(false);
    setBattleWinner(null);
    setIsEnemyTurn(false);
    setInBattle(true);
    logCounter.current += 1;
    setBattleLog([{ id: logCounter.current, text: `⚔️ Batalha iniciada! ${pf.name} vs ${ef.name}`, type: 'system' }]);
  }

  function startBattleAmigo() {
    if (!pvpOpponentCode.trim()) { setPvpParseError('Cole o código do oponente.'); return; }
    try {
      const data = JSON.parse(atob(pvpOpponentCode.trim()));
      const ef: BattleFighter = {
        name: data.name ?? 'Oponente',
        cls: data.class as PetClass,
        stats: data.stats as PetStats,
        currentHp: (data.stats as PetStats).maxHp,
        level: data.level ?? 1,
        atkBuff: 1, defBuff: 1,
        atkBuffTurns: 0, defBuffTurns: 0,
        burnTurns: 0, burnDamage: 0,
        stunTurns: 0,
      };
      const pf = createFighter(pet);
      setPlayerFighter(pf);
      setEnemyFighter(ef);
      setBattleLog([]);
      setBattleOver(false);
      setBattleWinner(null);
      setIsEnemyTurn(false);
      setInBattle(true);
      setPvpParseError('');
      logCounter.current += 1;
      setBattleLog([{ id: logCounter.current, text: `⚔️ PvP! ${pf.name} vs ${ef.name}`, type: 'system' }]);
    } catch {
      setPvpParseError('Código inválido. Verifique e tente novamente.');
    }
  }

  const getUnlockedAttacks = useCallback((cls: PetClass, level: number) => {
    return ATTACKS[cls].filter(a => a.unlockLevel <= level);
  }, []);

  const getAiAttack = useCallback((enemy: BattleFighter): PetAttack => {
    const available = getUnlockedAttacks(enemy.cls, enemy.level).filter(a => a.type !== 'buff' || Math.random() < 0.3);
    if (available.length === 0) return ATTACKS[enemy.cls][0];
    // Weighted toward higher power
    const weights = available.map(a => Math.max(0.5, a.power));
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return available[i];
    }
    return available[available.length - 1];
  }, [getUnlockedAttacks]);

  function applyAttack(
    attacker: BattleFighter,
    defender: BattleFighter,
    attack: PetAttack,
    isPlayerAttacking: boolean
  ): { newAttacker: BattleFighter; newDefender: BattleFighter; ended: boolean; winnerSide: 'player' | 'enemy' | null } {
    let na = { ...attacker };
    let nd = { ...defender };

    // Resolve buff expiry for attacker
    if (na.atkBuffTurns > 0) { na.atkBuffTurns--; if (na.atkBuffTurns === 0) na.atkBuff = 1; }
    if (na.defBuffTurns > 0) { na.defBuffTurns--; if (na.defBuffTurns === 0) na.defBuff = 1; }

    if (attack.type === 'buff') {
      const eff = attack.effect;
      if (eff) {
        if (eff.type === 'boost_atk') {
          na.atkBuff = eff.multiplier ?? 1.5;
          na.atkBuffTurns = eff.turns ?? 3;
          addLog(`${attacker.name} usou ${attack.icon} ${attack.name}! ATK +${Math.round((eff.multiplier! - 1) * 100)}% por ${eff.turns} turnos.`, 'buff');
        } else if (eff.type === 'boost_def') {
          na.defBuff = eff.multiplier ?? 1.8;
          na.defBuffTurns = eff.turns ?? 2;
          addLog(`${attacker.name} usou ${attack.icon} ${attack.name}! DEF +${Math.round((eff.multiplier! - 1) * 100)}% por ${eff.turns} turnos.`, 'buff');
        } else if (eff.type === 'heal') {
          const healAmt = Math.floor(na.stats.maxHp * (eff.healPercent ?? 0.25));
          na.currentHp = Math.min(na.stats.maxHp, na.currentHp + healAmt);
          addLog(`${attacker.name} usou ${attack.icon} ${attack.name}! Recuperou ${healAmt} HP.`, 'heal');
        }
      }
      return { newAttacker: na, newDefender: nd, ended: false, winnerSide: null };
    }

    if (attack.type === 'special' && attack.effect?.type === 'debuff_atk') {
      nd.atkBuff = attack.effect.multiplier ?? 0.7;
      nd.atkBuffTurns = attack.effect.turns ?? 2;
      addLog(`${attacker.name} usou ${attack.icon} ${attack.name}! ${defender.name} tem ATK reduzido por ${attack.effect.turns} turnos.`, 'buff');
      return { newAttacker: na, newDefender: nd, ended: false, winnerSide: null };
    }

    // Damage attack
    const { damage, isCrit } = calcDamage(na, nd, attack, attack.guaranteedCrit);
    nd.currentHp = Math.max(0, nd.currentHp - damage);
    addFloating(damage, !isPlayerAttacking, isCrit);

    if (isPlayerAttacking) { setEnemyShake(true); setEnemyFlash(true); setTimeout(() => { setEnemyShake(false); setEnemyFlash(false); }, 400); }
    else { setPlayerShake(true); setPlayerFlash(true); setTimeout(() => { setPlayerShake(false); setPlayerFlash(false); }, 400); }

    const critStr = isCrit ? ' (CRÍTICO!)' : '';
    addLog(`${attacker.name} usou ${attack.icon} ${attack.name}! ${damage} dano${critStr}.`, isPlayerAttacking ? 'player' : 'enemy');

    // Apply status effects to defender
    if (attack.effect?.type === 'stun') {
      nd.stunTurns = attack.effect.turns ?? 1;
      addLog(`${defender.name} foi atordoado!`, 'system');
    }
    if (attack.effect?.type === 'burn') {
      nd.burnTurns = attack.effect.turns ?? 3;
      nd.burnDamage = attack.effect.burnDamage ?? 8;
      addLog(`${defender.name} está envenenado!`, 'system');
    }

    if (nd.currentHp <= 0) {
      const winnerSide = isPlayerAttacking ? 'player' : 'enemy';
      addLog(`${defender.name} foi derrotado!`, 'system');
      return { newAttacker: na, newDefender: nd, ended: true, winnerSide };
    }

    // Burn damage
    if (nd.burnTurns > 0) {
      nd.currentHp = Math.max(0, nd.currentHp - nd.burnDamage);
      nd.burnTurns--;
      addLog(`${defender.name} sofreu ${nd.burnDamage} dano de veneno.`, 'system');
      if (nd.currentHp <= 0) {
        const winnerSide = isPlayerAttacking ? 'player' : 'enemy';
        addLog(`${defender.name} foi derrotado!`, 'system');
        return { newAttacker: na, newDefender: nd, ended: true, winnerSide };
      }
    }

    return { newAttacker: na, newDefender: nd, ended: false, winnerSide: null };
  }

  function handlePlayerAction(attack: PetAttack) {
    if (!playerFighter || !enemyFighter || battleOver || isEnemyTurn) return;

    const { newAttacker: np, newDefender: ne, ended, winnerSide } = applyAttack(playerFighter, enemyFighter, attack, true);
    setPlayerFighter(np);
    setEnemyFighter(ne);

    if (ended) {
      setBattleOver(true);
      setBattleWinner(winnerSide);
      if (winnerSide === 'player') {
        addExp(50);
        usePetsStore.setState(s => s.activePet ? { activePet: { ...s.activePet, battlesWon: s.activePet.battlesWon + 1 } } : {});
      } else {
        usePetsStore.setState(s => s.activePet ? { activePet: { ...s.activePet, battlesLost: s.activePet.battlesLost + 1 } } : {});
      }
      return;
    }

    setIsEnemyTurn(true);
    setTimeout(() => {
      setEnemyFighter(prev => {
        if (!prev) return prev;
        let curEnemy = { ...ne };
        let curPlayer = { ...np };

        // Check stun
        if (curEnemy.stunTurns > 0) {
          curEnemy.stunTurns--;
          addLog(`${curEnemy.name} está atordoado e perde o turno!`, 'system');
          setIsEnemyTurn(false);
          setPlayerFighter(curPlayer);
          setEnemyFighter(curEnemy);
          return curEnemy;
        }

        const aiAtk = getAiAttack(curEnemy);
        const { newAttacker: ne2, newDefender: np2, ended: ended2, winnerSide: ws2 } = applyAttack(curEnemy, curPlayer, aiAtk, false);
        setPlayerFighter(np2);
        setEnemyFighter(ne2);

        if (ended2) {
          setBattleOver(true);
          setBattleWinner(ws2);
          if (ws2 === 'enemy') {
            usePetsStore.setState(s => s.activePet ? { activePet: { ...s.activePet, battlesLost: s.activePet.battlesLost + 1 } } : {});
          }
        }

        setIsEnemyTurn(false);
        return ne2;
      });
    }, 1000);
  }

  function handleFlee() {
    addLog('Você fugiu da batalha!', 'system');
    setTimeout(() => {
      setInBattle(false);
      setPlayerFighter(null);
      setEnemyFighter(null);
    }, 800);
  }

  const unlockedAttacks = getUnlockedAttacks(pet.class, pet.level);

  const tabs = [
    { id: 'pet' as const, label: 'Meu Pet' },
    { id: 'battle' as const, label: 'Batalhar' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 18px', borderRadius: 10,
              background: activeTab === tab.id ? `${cfg.color}22` : 'transparent',
              border: `1px solid ${activeTab === tab.id ? cfg.color + '88' : 'var(--b2)'}`,
              color: activeTab === tab.id ? cfg.accent : 'var(--t3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
            onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {tab.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={abandonPet}
          style={{
            padding: '7px 14px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--b2)',
            color: 'var(--t4)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
        >
          Abandonar Pet
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 0 0' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'pet' && (
            <motion.div
              key="pet-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%', display: 'flex', gap: 16, padding: '0 16px 16px', overflow: 'hidden' }}
            >
              {/* Left: avatar */}
              <div style={{
                width: '38%', minWidth: 200, flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 10, overflowY: 'auto',
              }}>
                {/* Floating avatar */}
                <motion.div
                  animate={{ y: [-6, 0, -6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position: 'relative' }}
                >
                  <motion.div
                    animate={levelUpFlash ? {
                      boxShadow: [`0 0 0px ${cfg.color}`, `0 0 40px ${cfg.color}`, `0 0 0px ${cfg.color}`],
                    } : { boxShadow: `0 4px 20px ${cfg.color}40` }}
                    transition={{ duration: 0.8 }}
                    style={{
                      width: evoSize, height: evoSize,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${cfg.color}30, ${cfg.color}10)`,
                      border: `2px solid ${cfg.color}66`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: evoSize * 0.5,
                    }}
                  >
                    {cfg.icon}
                  </motion.div>
                </motion.div>

                {/* Name (editable) */}
                {editingName ? (
                  <input
                    type="text"
                    value={nameInput}
                    autoFocus
                    onChange={e => setNameInput(e.target.value)}
                    onBlur={() => { renamePet(nameInput); setEditingName(false); }}
                    onKeyDown={e => { if (e.key === 'Enter') { renamePet(nameInput); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
                    maxLength={24}
                    style={{
                      textAlign: 'center', fontSize: 16, fontWeight: 700,
                      background: 'var(--ib)', border: `1px solid ${cfg.color}`,
                      borderRadius: 8, padding: '4px 10px', color: 'var(--t1)', outline: 'none',
                      width: '80%',
                    }}
                  />
                ) : (
                  <button
                    onClick={() => { setNameInput(pet.name); setEditingName(true); }}
                    title="Clique para renomear"
                    style={{
                      fontSize: 16, fontWeight: 700, color: 'var(--t1)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px 8px', borderRadius: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    {pet.name} ✏️
                  </button>
                )}

                {/* Level badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: `${cfg.color}18`,
                  border: `1px solid ${cfg.color}44`,
                  borderRadius: 99, padding: '4px 12px',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>LV {pet.level}</span>
                  <span style={{ width: 1, height: 12, background: `${cfg.color}44` }} />
                  <span style={{ fontSize: 11, color: cfg.accent }}>
                    {'★'.repeat(evo)}{'☆'.repeat(3 - evo)}
                  </span>
                </div>

                {/* Evo label */}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)' }}>
                  FORMA {evo}
                </div>

                {/* EXP bar */}
                <div style={{ width: '90%' }}>
                  <ExpBar exp={pet.exp} level={pet.level} />
                </div>

                {/* Claim XP button */}
                {totalUnclaimedXp > 0 && (
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={handleClaimXp}
                    style={{
                      padding: '8px 18px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
                      border: 'none', cursor: 'pointer', color: '#fff',
                      fontSize: 12, fontWeight: 700,
                      boxShadow: '0 2px 12px rgba(53,107,255,0.4)',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    ✨ Reivindicar +{totalUnclaimedXp} XP
                  </motion.button>
                )}

                {/* Battle record */}
                <div style={{
                  display: 'flex', gap: 12, padding: '8px 16px',
                  background: 'var(--s1)', borderRadius: 10,
                  fontSize: 12, color: 'var(--t3)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#22C55E' }}>{pet.battlesWon}</div>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>Vitórias</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--b2)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#EF4444' }}>{pet.battlesLost}</div>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>Derrotas</div>
                  </div>
                </div>
              </div>

              {/* Right: stats */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', minWidth: 0 }}>
                {/* Stats panel */}
                <div style={{ background: 'var(--s1)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12 }}>
                    Atributos — Nível {pet.level}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <StatBar statKey="maxHp" value={stats.maxHp} animated />
                    <StatBar statKey="atk" value={stats.atk} animated />
                    <StatBar statKey="def" value={stats.def} animated />
                    <StatBar statKey="int" value={stats.int} animated />
                    <StatBar statKey="dex" value={stats.dex} animated />
                  </div>
                </div>

                {/* Attacks panel */}
                <div style={{ background: 'var(--s1)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12 }}>
                    Ataques
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ATTACKS[pet.class].map(atk => {
                      const isUnlocked = atk.unlockLevel <= pet.level;
                      return (
                        <div
                          key={atk.name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 10,
                            background: isUnlocked ? `${cfg.color}14` : 'var(--s1)',
                            border: `1px solid ${isUnlocked ? cfg.color + '44' : 'var(--b1)'}`,
                            opacity: isUnlocked ? 1 : 0.5,
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ fontSize: 20, lineHeight: 1 }}>{atk.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: isUnlocked ? 'var(--t1)' : 'var(--t4)' }}>
                              {atk.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                              {atk.type} {atk.power > 0 ? `· poder ${atk.power}x` : ''} {atk.effect ? `· ${atk.effect.type}` : ''}
                            </div>
                          </div>
                          {!isUnlocked && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
                              color: 'var(--t4)', background: 'var(--s2)',
                              padding: '2px 7px', borderRadius: 6,
                            }}>
                              LV {atk.unlockLevel}
                            </span>
                          )}
                          {isUnlocked && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: cfg.accent,
                              background: `${cfg.color}18`, padding: '2px 7px', borderRadius: 6,
                            }}>
                              ✓ Desbloqueado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'battle' && (
            <motion.div
              key="battle-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <AnimatePresence mode="wait">
                {inBattle && playerFighter && enemyFighter ? (
                  <motion.div
                    key="arena"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  >
                    <BattleArena
                      player={playerFighter}
                      enemy={enemyFighter}
                      playerAttacks={unlockedAttacks}
                      onAction={handlePlayerAction}
                      onFlee={handleFlee}
                      battleLog={battleLog}
                      floatingNums={floatingNums}
                      playerShake={playerShake}
                      enemyShake={enemyShake}
                      playerFlash={playerFlash}
                      enemyFlash={enemyFlash}
                      battleOver={battleOver}
                      winner={battleWinner}
                      playerClass={pet.class}
                      isEnemyTurn={isEnemyTurn}
                    />
                    {battleOver && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => { setInBattle(false); setBattleMode('none'); }}
                          style={{
                            padding: '8px 24px', borderRadius: 10,
                            background: 'var(--s2)', border: '1px solid var(--b2)',
                            color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                        >
                          Voltar
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="battle-menu"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ padding: '4px 16px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}
                  >
                    {/* Battle vs IA */}
                    <div style={{ background: 'var(--s1)', borderRadius: 14, padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ fontSize: 28 }}>🤖</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>vs IA</div>
                          <div style={{ fontSize: 12, color: 'var(--t3)' }}>Enfrente um oponente gerado automaticamente</div>
                        </div>
                      </div>
                      <button
                        onClick={startBattleIa}
                        style={{
                          padding: '9px 20px', borderRadius: 10,
                          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)`,
                          border: 'none', cursor: 'pointer', color: '#fff',
                          fontSize: 13, fontWeight: 700,
                          boxShadow: `0 2px 12px ${cfg.color}50`,
                          transition: 'opacity 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                      >
                        ⚔️ Batalhar vs IA
                      </button>
                    </div>

                    {/* Battle vs Amigo */}
                    <div style={{ background: 'var(--s1)', borderRadius: 14, padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ fontSize: 28 }}>👥</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>vs Amigo (PvP)</div>
                          <div style={{ fontSize: 12, color: 'var(--t3)' }}>Troque códigos com um amigo e batalhe</div>
                        </div>
                      </div>

                      {/* Export code */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>
                          Código do seu pet:
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8,
                            background: 'var(--ib)', border: '1px solid var(--b2)',
                            fontSize: 11, color: 'var(--t4)',
                            fontFamily: 'monospace', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {pvpCode}
                          </div>
                          <button
                            onClick={handleCopyPvpCode}
                            style={{
                              padding: '8px 14px', borderRadius: 8, flexShrink: 0,
                              background: pvpCopied ? 'rgba(34,197,94,0.15)' : 'var(--s2)',
                              border: `1px solid ${pvpCopied ? 'rgba(34,197,94,0.4)' : 'var(--b2)'}`,
                              color: pvpCopied ? '#22C55E' : 'var(--t2)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {pvpCopied ? '✓ Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      {/* Paste opponent code */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>
                          Código do oponente:
                        </div>
                        <textarea
                          value={pvpOpponentCode}
                          onChange={e => { setPvpOpponentCode(e.target.value); setPvpParseError(''); }}
                          placeholder="Cole aqui o código do pet do seu amigo..."
                          rows={2}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '8px 10px', borderRadius: 8,
                            background: 'var(--ib)', border: `1px solid ${pvpParseError ? 'rgba(239,68,68,0.6)' : 'var(--b2)'}`,
                            color: 'var(--t1)', fontSize: 12, outline: 'none',
                            resize: 'none', fontFamily: 'monospace',
                            marginBottom: 8,
                          }}
                        />
                        {pvpParseError && (
                          <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 8 }}>{pvpParseError}</div>
                        )}
                        <button
                          onClick={startBattleAmigo}
                          style={{
                            padding: '9px 20px', borderRadius: 10,
                            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)`,
                            border: 'none', cursor: 'pointer', color: '#fff',
                            fontSize: 13, fontWeight: 700,
                            boxShadow: `0 2px 12px ${cfg.color}50`,
                            transition: 'opacity 0.15s, transform 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                        >
                          ⚔️ Batalhar vs Amigo
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main GamesPage ───────────────────────────────────────────────────────────
export function GamesPage() {
  const { activePet, claimTasksXp, claimIdeasXp, tasksXpClaimed, ideasXpClaimed } = usePetsStore();
  const { tasks } = useTaskStore();
  const { ideas } = useIdeasStore();

  // Auto-claim XP on mount
  useEffect(() => {
    if (!activePet) return;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const ideasCount = ideas.length;
    if (doneTasks > tasksXpClaimed) claimTasksXp(doneTasks);
    if (ideasCount > ideasXpClaimed) claimIdeasXp(ideasCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Header stat chips ──────────────────────────────────────────────────
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const ideasCount = ideas.length;
  const headerChips = activePet
    ? ([
        { label: 'Pet',     value: activePet.name,                              color: '#bf5af2', rgb: '191,90,242' },
        { label: 'Nível',   value: activePet.level,                             color: '#ff9f0a', rgb: '255,159,10' },
        { label: 'Vitórias', value: activePet.battlesWon,                       color: '#30d158', rgb: '48,209,88' },
        { label: 'Derrotas', value: activePet.battlesLost,                      color: '#ff453a', rgb: '255,69,58' },
      ] as { label: string; value: string | number; color: string; rgb: string }[])
    : ([
        { label: 'Tarefas concluídas', value: doneTasks,  color: '#30d158', rgb: '48,209,88' },
        { label: 'Ideias',              value: ideasCount, color: '#356BFF', rgb: '53,107,255' },
      ] as { label: string; value: string | number; color: string; rgb: string }[]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Compact sticky header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Diversão</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Jogos</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: 5, padding: '2px 6px' }}>beta</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {headerChips.map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {!activePet ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              style={{ height: '100%', overflow: 'hidden' }}
            >
              <PetSelectionScreen />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              style={{ height: '100%', overflow: 'hidden' }}
            >
              <PetGameScreen pet={activePet} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
