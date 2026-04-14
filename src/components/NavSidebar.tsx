import { useState, useEffect } from 'react';
import {
  FiHome, FiCheckSquare, FiBriefcase, FiSettings,
  FiPlus, FiChevronDown, FiChevronRight, FiChevronLeft,
  FiEye, FiEyeOff, FiArchive, FiDownload, FiSun, FiMoon,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import type { PageType, Theme } from '../types';
import EvoIcon from '../assets/images/Logos/Icons/Icone/4.svg';

interface Props {
  currentPage: PageType;
  onChangePage: (p: PageType) => void;
  onAddTask: () => void;
  onOpenSettings: () => void;
}

const NAV = [
  { id: 'home'     as PageType, label: 'Home',     Icon: FiHome },
  { id: 'tarefas'  as PageType, label: 'Tarefas',  Icon: FiCheckSquare },
  { id: 'empresas' as PageType, label: 'Empresas', Icon: FiBriefcase },
  { id: 'arquivo'  as PageType, label: 'Arquivo',  Icon: FiArchive },
];

const THEMES: Theme[] = ['dark-blue', 'dark-pure', 'dark-warm', 'light-soft', 'light-pure'];
const THEME_LABELS: Record<Theme, string> = {
  'dark-blue': 'Azul Escuro',
  'dark-pure': 'Preto',
  'dark-warm': 'Quente Escuro',
  'light-soft': 'Claro Suave',
  'light-pure': 'Branco',
};

const dragRegion: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragRegion: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export function NavSidebar({ currentPage, onChangePage, onAddTask, onOpenSettings }: Props) {
  const {
    companies, subClients, tasks,
    selectedCompanies, toggleCompany, selectAllCompanies, deselectAllCompanies,
    filterSubClient, setFilterSubClient,
    sidebarCollapsed, toggleSidebar,
    theme, setTheme,
  } = useTaskStore();

  const isLightTheme = theme === 'light-soft' || theme === 'light-pure';
  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'downloaded' | 'error'>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI?.onUpdateAvailable(() => setUpdateStatus('available'));
    window.electronAPI?.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    window.electronAPI?.onUpdateError?.((msg: string) => { setUpdateStatus('error'); setUpdateError(msg); });
  }, []);

  const toggleExpand = (id: string) =>
    setExpanded(p => ({ ...p, [id]: !p[id] }));

  const countFor = (companyId: string) =>
    tasks.filter(t => t.companyId === companyId && t.status !== 'done' && !t.archived).length;

  const allSelected = selectedCompanies.length === companies.length;

  if (sidebarCollapsed) {
    return (
      <aside style={{
        width: 56, minWidth: 56, height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--b1)',
        flexShrink: 0, overflow: 'hidden', gap: 4,
      }}>
        {/* Drag region — espaço para os traffic lights do macOS */}
        <div style={{ width: '100%', height: 38, flexShrink: 0, ...dragRegion }} />

        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(53,107,255,0.4)', marginBottom: 8,
          ...noDragRegion,
        }}>
          <img src={EvoIcon} alt="Evo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
        </div>

        {NAV.map(({ id, Icon }) => (
          <button
            key={id}
            onClick={() => onChangePage(id)}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10, background: currentPage === id ? 'rgba(53,107,255,0.2)' : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'background .15s',
              color: currentPage === id ? '#64C4FF' : 'var(--t3)',
            }}
            onMouseEnter={e => { if (currentPage !== id) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
            onMouseLeave={e => { if (currentPage !== id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Icon size={16} />
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={onAddTask}
          title="Nova Tarefa (N)"
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #356BFF, #4F8AFF)', border: 'none', cursor: 'pointer', color: '#fff',
            boxShadow: '0 4px 14px rgba(53,107,255,0.35)',
          }}
        >
          <FiPlus size={16} />
        </button>

        {updateStatus !== 'idle' && (
          <button
            onClick={() => { if (updateStatus === 'downloaded') window.electronAPI?.installUpdate(); else window.electronAPI?.checkForUpdates(); }}
            title={updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
            style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : 'rgba(53,107,255,0.12)',
              border: 'none', cursor: 'pointer',
              color: updateStatus === 'downloaded' ? '#30d158' : '#356BFF',
            }}
          >
            <FiDownload size={14} />
          </button>
        )}

        <button
          onClick={cycleTheme}
          title={`Tema: ${THEME_LABELS[theme]} → próximo`}
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          {isLightTheme ? <FiMoon size={14} /> : <FiSun size={14} />}
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            marginBottom: 8, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiSettings size={14} />
        </button>

        <button
          onClick={toggleSidebar}
          title="Expandir sidebar"
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            marginBottom: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiChevronRight size={14} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 224, minWidth: 224, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--b1)',
        position: 'sticky', top: 0, flexShrink: 0, overflow: 'hidden',
      }}
    >
      {/* Drag region — espaço para os traffic lights do macOS */}
      <div style={{ width: '100%', height: 38, flexShrink: 0, ...dragRegion }} />

      {/* Logo */}
      <div style={{ padding: '4px 18px 16px', flexShrink: 0, ...noDragRegion }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(53,107,255,0.4)', flexShrink: 0,
          }}>
            <img src={EvoIcon} alt="Evo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Evo<span style={{ fontWeight: 300, opacity: 0.5 }}> Tasks</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Studio
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            title="Recolher sidebar"
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
          >
            <FiChevronLeft size={13} />
          </button>
        </div>
      </div>

      {/* Nova tarefa */}
      <div style={{ padding: '0 12px 16px', flexShrink: 0 }}>
        <button
          onClick={onAddTask}
          title="Nova Tarefa (N)"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, padding: '10px 0', borderRadius: 12,
            background: 'linear-gradient(135deg, #356BFF, #4F8AFF)',
            boxShadow: '0 4px 14px rgba(53,107,255,0.35)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: 'none', transition: 'box-shadow .2s, transform .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(53,107,255,0.55)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(53,107,255,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
        >
          <FiPlus size={15} /> Nova Tarefa
        </button>
      </div>

      <div style={{ margin: '0 12px 4px', height: 1, background: 'var(--b1)', flexShrink: 0 }} />

      {/* Navigation */}
      <nav style={{ padding: '8px 8px 0', flexShrink: 0 }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onChangePage(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                background: active ? 'rgba(53,107,255,0.18)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'background .15s',
                borderLeft: active ? '2px solid #356BFF' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={15} style={{ color: active ? '#64C4FF' : 'var(--t3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#356BFF' : 'var(--t2)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ margin: '8px 12px', height: 1, background: 'var(--b1)', flexShrink: 0 }} />

      {/* Empresas tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)' }}>
            Clientes
          </div>
          <button
            onClick={allSelected ? deselectAllCompanies : selectAllCompanies}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
              color: 'var(--t4)', transition: 'color .15s', padding: '2px 4px',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
          >
            {allSelected ? 'Nenhum' : 'Todos'}
          </button>
        </div>

        {companies.map(company => {
          const subs = subClients.filter(s => s.companyId === company.id);
          const open = expanded[company.id];
          const pending = countFor(company.id);
          const isActive = selectedCompanies.includes(company.id);

          return (
            <div key={company.id}>
              <div
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                  transition: 'background .15s',
                  opacity: isActive ? 1 : 0.35,
                }}
                onMouseEnter={() => setHoveredCompany(company.id)}
                onMouseLeave={() => setHoveredCompany(null)}
              >
                <button
                  onClick={() => toggleCompany(company.id)}
                  title={isActive ? 'Ocultar empresa' : 'Mostrar empresa'}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: company.color, flexShrink: 0,
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'transform .15s, box-shadow .15s',
                    boxShadow: isActive ? `0 0 6px ${company.color}88` : 'none',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                />

                <button
                  onClick={() => toggleExpand(company.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {company.name}
                  </span>
                  {pending > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: company.color,
                      background: `${company.color}22`, borderRadius: 99,
                      padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0,
                    }}>
                      {pending}
                    </span>
                  )}
                  {subs.length > 0 && (
                    open
                      ? <FiChevronDown size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                      : <FiChevronRight size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                  )}
                </button>

                {hoveredCompany === company.id && (
                  <button
                    onClick={() => toggleCompany(company.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: isActive ? 'var(--t3)' : '#64C4FF',
                      padding: 2, display: 'flex', transition: 'color .15s',
                    }}
                  >
                    {isActive ? <FiEye size={11} /> : <FiEyeOff size={11} />}
                  </button>
                )}
              </div>

              {open && subs.map(sub => {
                const isSubActive = filterSubClient === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setFilterSubClient(sub.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 10px 5px 28px',
                      background: isSubActive ? `${company.color}12` : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6, transition: 'background .15s',
                    }}
                    onMouseEnter={e => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
                    onMouseLeave={e => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ width: 1, height: 12, background: isSubActive ? company.color : 'var(--b3)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: isSubActive ? company.color : 'var(--t3)', fontWeight: isSubActive ? 600 : 400 }}>
                      {sub.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom: settings */}
      <div style={{ padding: '8px 8px 16px', flexShrink: 0 }}>
        <div style={{ margin: '0 4px 8px', height: 1, background: 'var(--b1)' }} />

        {updateStatus !== 'idle' && (
          <>
            <button
              onClick={() => {
                if (updateStatus === 'downloaded') window.electronAPI?.installUpdate();
                else window.electronAPI?.checkForUpdates();
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px', borderRadius: 10, marginBottom: 4,
                background: updateStatus === 'error' ? 'rgba(255,69,58,0.12)' : updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : 'rgba(53,107,255,0.12)',
                border: 'none', cursor: 'pointer',
                color: updateStatus === 'error' ? '#ff453a' : updateStatus === 'downloaded' ? '#30d158' : '#356BFF',
                fontSize: 12, fontWeight: 600, transition: 'opacity .15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              <FiDownload size={13} />
              {updateStatus === 'error' ? 'Erro na atualização' : updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
            </button>
            {updateStatus === 'error' && updateError && (
              <div style={{ fontSize: 10, color: '#ff453a', padding: '0 12px 6px', opacity: 0.8, wordBreak: 'break-word' }}>
                {updateError}
              </div>
            )}
          </>
        )}

        <button
          onClick={cycleTheme}
          title={`Tema atual: ${THEME_LABELS[theme]}`}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', borderRadius: 10, background: 'transparent',
            border: 'none', cursor: 'pointer', color: 'var(--t3)',
            fontSize: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
        >
          {isLightTheme ? <FiMoon size={13} /> : <FiSun size={13} />}
          {THEME_LABELS[theme]}
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', borderRadius: 10, background: 'transparent',
            border: 'none', cursor: 'pointer', color: 'var(--t3)',
            fontSize: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
        >
          <FiSettings size={13} /> Configurações
        </button>
      </div>
    </aside>
  );
}
