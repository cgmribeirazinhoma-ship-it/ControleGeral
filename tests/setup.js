// ═══════════════════════════════════════════════════════════════════
// Jest Setup - ControleGeral Test Suite
// ═══════════════════════════════════════════════════════════════════

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock sessionStorage
global.sessionStorage = { ...global.localStorage };

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    clone: () => ({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('')
    })
  })
);

// Mock Service Worker
global.navigator = {
  ...global.navigator,
  serviceWorker: {
    register: jest.fn(() => Promise.resolve()),
    ready: Promise.resolve()
  }
};

// Mock cache API
global.caches = {
  open: jest.fn(() => Promise.resolve({
    add: jest.fn(() => Promise.resolve()),
    addAll: jest.fn(() => Promise.resolve()),
    put: jest.fn(() => Promise.resolve()),
    match: jest.fn(() => Promise.resolve())
  })),
  keys: jest.fn(() => Promise.resolve([])),
  delete: jest.fn(() => Promise.resolve())
};

// Console mock para capturar logs
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn(originalError);
  console.warn = jest.fn(originalWarn);
});

afterEach(() => {
  jest.clearAllMocks();
};
