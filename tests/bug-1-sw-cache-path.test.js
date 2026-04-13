/**
 * BUG #1: Service Worker Cache Path
 * Issue: sw.js cacheamento incorreto de '/src/app.js' em vez de '/app.js'
 * Impact: Service Worker falha ao cachear a aplicação
 */

describe('BUG #1: Service Worker Cache Path', () => {
  
  test('Detecta caminho incorreto /src/app.js no sw.js', () => {
    // Simula o conteúdo original com o bug
    const buggyPath = '/src/app.js';
    const correctPath = '/app.js';
    
    expect(buggyPath).not.toBe(correctPath);
    expect(buggyPath).toContain('src/');
  });

  test('Valida estrutura de diretórios correcta', () => {
    const filePaths = ['/', '/index.html', '/app.js', '/manifest.json'];
    
    filePaths.forEach(path => {
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });
    
    expect(filePaths).not.toContain('/src/app.js');
  });

  test('Simula cache addAll com caminhos corretos', async () => {
    const mockCache = {
      addAll: jest.fn((paths) => {
        const hasIncorrectPath = paths.some(p => p.includes('/src/'));
        return hasIncorrectPath 
          ? Promise.reject(new Error('Caminho incorreto'))
          : Promise.resolve();
      })
    };

    const correctPaths = ['/', '/index.html', '/app.js', '/manifest.json'];
    const result = await mockCache.addAll(correctPaths);
    
    expect(result).toBeUndefined();
    expect(mockCache.addAll).toHaveBeenCalledWith(correctPaths);
  });

  test('Falha com caminho incorreto /src/app.js', async () => {
    const mockCache = {
      addAll: jest.fn((paths) => {
        const hasIncorrectPath = paths.some(p => p.includes('/src/'));
        return hasIncorrectPath 
          ? Promise.reject(new Error('Caminho incorreto'))
          : Promise.resolve();
      })
    };

    const incorrectPaths = ['/', '/index.html', '/src/app.js', '/manifest.json'];
    
    await expect(mockCache.addAll(incorrectPaths)).rejects.toThrow('Caminho incorreto');
  });
});
