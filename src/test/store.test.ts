import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../store/tasks';

const baseTask = {
  companyId: 'c1',
  subClientId: '',
  taskType: 'feed' as const,
  sequence: 1,
  date: '2026-04-17',
  status: 'todo' as const,
  archived: false,
  inbox: false,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  localStorage.clear();
  useTaskStore.setState({ tasks: [], companies: [], quickNotes: [], userName: '' });
});

describe('addTask', () => {
  it('adiciona uma tarefa à lista', () => {
    useTaskStore.getState().addTask(baseTask);
    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().tasks[0].companyId).toBe('c1');
  });

  it('tarefa nova começa com status "todo"', () => {
    useTaskStore.getState().addTask(baseTask);
    expect(useTaskStore.getState().tasks[0].status).toBe('todo');
  });

  it('tarefa nova não está arquivada', () => {
    useTaskStore.getState().addTask(baseTask);
    expect(useTaskStore.getState().tasks[0].archived).toBe(false);
  });

  it('retorna o id da nova tarefa', () => {
    const id = useTaskStore.getState().addTask(baseTask);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('updateTask', () => {
  it('atualiza o status da tarefa', () => {
    useTaskStore.getState().addTask(baseTask);
    const id = useTaskStore.getState().tasks[0].id;
    useTaskStore.getState().updateTask(id, { status: 'done' });
    expect(useTaskStore.getState().tasks[0].status).toBe('done');
  });

  it('não afeta outras tarefas', () => {
    useTaskStore.getState().addTask(baseTask);
    useTaskStore.getState().addTask({ ...baseTask, companyId: 'c2' });
    const [id1] = useTaskStore.getState().tasks.map(t => t.id);
    useTaskStore.getState().updateTask(id1, { status: 'doing' });
    expect(useTaskStore.getState().tasks[1].status).toBe('todo');
  });
});

describe('deleteTask', () => {
  it('remove a tarefa da lista', () => {
    useTaskStore.getState().addTask(baseTask);
    const id = useTaskStore.getState().tasks[0].id;
    useTaskStore.getState().deleteTask(id);
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });
});

describe('arquivar tarefa via updateTask', () => {
  it('arquiva sem deletar', () => {
    useTaskStore.getState().addTask(baseTask);
    const id = useTaskStore.getState().tasks[0].id;
    useTaskStore.getState().updateTask(id, { archived: true });
    const task = useTaskStore.getState().tasks.find(t => t.id === id);
    expect(task).toBeDefined();
    expect(task?.archived).toBe(true);
  });
});

describe('quickNotes', () => {
  it('adiciona uma nota', () => {
    useTaskStore.getState().addQuickNote('Lembrar de ligar');
    expect(useTaskStore.getState().quickNotes).toHaveLength(1);
    expect(useTaskStore.getState().quickNotes[0].text).toBe('Lembrar de ligar');
  });

  it('nota nova começa desmarcada', () => {
    useTaskStore.getState().addQuickNote('teste');
    expect(useTaskStore.getState().quickNotes[0].checked).toBe(false);
  });

  it('toggleQuickNote marca e desmarca', () => {
    useTaskStore.getState().addQuickNote('teste');
    const id = useTaskStore.getState().quickNotes[0].id;
    useTaskStore.getState().toggleQuickNote(id);
    expect(useTaskStore.getState().quickNotes[0].checked).toBe(true);
    useTaskStore.getState().toggleQuickNote(id);
    expect(useTaskStore.getState().quickNotes[0].checked).toBe(false);
  });

  it('deleteQuickNote remove a nota', () => {
    useTaskStore.getState().addQuickNote('remover');
    const id = useTaskStore.getState().quickNotes[0].id;
    useTaskStore.getState().deleteQuickNote(id);
    expect(useTaskStore.getState().quickNotes).toHaveLength(0);
  });
});

describe('userName', () => {
  it('salva e lê o nome do usuário', () => {
    useTaskStore.getState().setUserName('Gabriel');
    expect(useTaskStore.getState().userName).toBe('Gabriel');
  });

  it('aceita string vazia para resetar', () => {
    useTaskStore.getState().setUserName('Gabriel');
    useTaskStore.getState().setUserName('');
    expect(useTaskStore.getState().userName).toBe('');
  });
});
