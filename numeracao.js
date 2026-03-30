// ─── Sistema de Auditoria de Numeração ───────────────────────────────────────
// ─── [C2] Sistema de Auditoria de Numeração ──────────────────────────────────
// Garante que o próximo número:
//  1. Parte sempre do MAIOR número existente nos processos + 1
//  2. Nunca repete um número já usado
//  3. Persiste o último número base no storage (âncora)
//  4. Após importar planilha, ancora no maior número REAL (ignora fórmulas =LN+1)

// Extrai apenas inteiros positivos reais — ignora fórmulas, strings, NaN
function _numsSeguros(processos) {
  return (processos || [])
    .map(p => {
      const raw = String(p["NÚMERO DO DOCUMENTO"] || "").trim();
      // Ignorar fórmulas Excel (=L2+1 etc.) que possam ter escapado da importação
      if (raw.startsWith("=")) return NaN;
      const n = parseInt(raw, 10);
      // Limite razoável: números de processo não chegam a 99999
      return (!isNaN(n) && n > 0 && n < 99999) ? n : NaN;
    })
    .filter(n => !isNaN(n));
}

function proxNumero(processos) {
  const nums = _numsSeguros(processos);
  if (!nums.length) return 1;
  const usados = new Set(nums);
  let next = nums.reduce((a,b) => a > b ? a : b, 0) + 1;
  while (usados.has(next)) next++;
  return next;
}

// Verifica se um número específico já está em uso
function numeroDuplicado(num, processos, numOriginalEdicao) {
  const n = parseInt(String(num).trim(), 10);
  if (isNaN(n) || n <= 0) return false;
  return processos.some(p => {
    const raw = String(p["NÚMERO DO DOCUMENTO"] || "").trim();
    if (raw.startsWith("=")) return false;
    const pn = parseInt(raw, 10);
    if (numOriginalEdicao && pn === parseInt(String(numOriginalEdicao).trim(), 10)) return false;
    return pn === n;
  });
}

// Calcula o maior número REAL (ignora fórmulas) de um conjunto de processos
function maiorNumero(processos) {
  const nums = _numsSeguros(processos);
  return nums.length ? nums.reduce((a,b) => a > b ? a : b, 0) : 0;
}

