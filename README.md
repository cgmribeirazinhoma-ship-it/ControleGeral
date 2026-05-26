# ControleGeral v5.1.5
**Sistema de Controle de Processos de Pagamento**
Prefeitura Gov. Edison Lobão / MA

## Changelog

### v5.1.5 — Layout PDF fiel aos modelos
**Capa (Página 1):**
- Brasão + cabeçalho institucional centralizado
- Separador duplo azul abaixo do cabeçalho
- Banner "PROCESSO DE PAGAMENTO" preenchido azul, texto branco grande
- Campos SEM caixas: "Label: Valor" inline, label negrito azul, linha separadora fina cinza-azulada entre campos
- Rodapé: barra azul-marinha, pin branco, texto branco

**Ateste / Parecer (Página 2):**
- Barra de cabeçalho azul-marinha full-width com brasão à esquerda
- Título em caixa azul-marinha, texto branco
- Seções com linha divisória (traço + quadrado-ícone colorido + label + linha)
  - Dados do Processo: azul (ícone documento)
  - Verificação Documental: laranja (ícone checkmark)
  - Observação: verde-azulado (ícone balão)
  - Assinatura: laranja-avermelhado (ícone caneta)
- Tabela Dados: linhas alternadas azul-claro, separador vertical, última linha 4 colunas (CNPJ|Nº|Tipo|Valor)
- Checklist: badge-círculo azul-escuro numerado + texto negrito + checkbox verde/vermelho
- Rodapé: barra cinza-claro, pin laranja, texto escuro

### v5.1.2 (base)
- Modularização src/, Fix SW, Sync Lock, Polling 20s
