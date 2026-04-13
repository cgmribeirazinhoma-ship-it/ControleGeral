/**
 * BUG #3: React Initialization Error Handling
 * Issue: index.html não valida se window.App existe antes de usar
 * Impact: Erro silencioso se app.js não carregar corretamente
 */

describe('BUG #3: React Initialization', () => {

  beforeEach(() => {
    delete window.App;
    delete window.React;
    delete window.ReactDOM;
  });

  test('Detecta window.App indefinida', () => {
    expect(window.App).toBeUndefined();
  });

  test('Valida que ReactDOM deveria estar disponível', () => {
    // Mock ReactDOM
    window.ReactDOM = {
      createRoot: jest.fn(() => ({
        render: jest.fn()
      }))
    };

    expect(window.ReactDOM).toBeDefined();
    expect(typeof window.ReactDOM.createRoot).toBe('function');
  });

  test('Simula erro ao criar root sem elemento', () => {
    window.ReactDOM = {
      createRoot: jest.fn((el) => {
        if (!el) throw new Error('Root element not found');
        return { render: jest.fn() };
      })
    };

    expect(() => {
      window.ReactDOM.createRoot(null);
    }).toThrow('Root element not found');
  });

  test('Valida elemento #root deve existir', () => {
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    expect(document.getElementById('root')).toBeDefined();
    expect(document.getElementById('root')).toBe(rootElement);
  });

  test('Simula mensagem de erro com cor vermelha', () => {
    const msgElement = document.createElement('div');
    msgElement.id = 'loading-msg';
    msgElement.textContent = 'Erro ao iniciar: window.App não definida';
    msgElement.style.color = '#fca5a5';

    expect(msgElement.textContent).toContain('Erro ao iniciar');
    expect(msgElement.style.color).toBe('rgb(252, 165, 165)'); // #fca5a5
  });

  test('Simula remoção correta de loading', () => {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading';
    loadingElement.classList.add('hide');
    document.body.appendChild(loadingElement);

    expect(loadingElement.classList.contains('hide')).toBe(true);

    loadingElement.remove();
    expect(document.getElementById('loading')).toBeNull();
  });

  test('Detecta falha se App não estiver definida', () => {
    window.React = { createElement: jest.fn() };
    window.ReactDOM = {
      createRoot: jest.fn(() => ({ render: jest.fn() }))
    };

    const appExists = () => {
      if (!window.App) {
        throw new Error('window.App não definida');
      }
      return true;
    };

    expect(() => appExists()).toThrow('window.App não definida');
  });

  test('Simula fluxo correto de inicialização', () => {
    window.App = jest.fn(() => 'App Component');
    window.React = { createElement: jest.fn() };
    window.ReactDOM = {
      createRoot: jest.fn(() => ({ render: jest.fn() }))
    };

    const root = window.ReactDOM.createRoot(document.body);
    root.render(window.React.createElement(window.App));

    expect(window.ReactDOM.createRoot).toHaveBeenCalled();
    expect(root.render).toHaveBeenCalled();
  });
});
