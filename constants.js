// ─── Constantes do sistema ───────────────────────────────────────────────────
// ─── Constantes ───────────────────────────────────────────────────────────────
const MESES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const CHK = {
  padrao: ["Validação do Documento Fiscal", "Emissão e Autenticação das Certidões Negativas", "Conformidade com o processo Licitatório", "Disponibilidade de Saldos Licitatórios", "Outros: Contratos, Valores, Impostos", "Extrato do Contrato"],
  eng: ["Validação do Documento Fiscal", "Emissão e Autenticação das Certidões Negativas", "Conformidade com o processo Licitatório", "Disponibilidade de Saldos Licitatórios", "Solicitação de pagamento com medição", "Planilha de medição assinada", "Relatório fotográfico", "Cópia Do Contrato", "ART ou RRT"],
  tdf: ["Ofício", "Formulário TFD", "Conformidade com o processo Licitatório", "Laudo Médico", "Documentos pessoais"],
  passagem: ["Prestação de contas diárias", "Documentação comprobatória", "Requerimento de restituição"],
  // Aldir Blanc / PNAB — baseado no modelo oficial
  pnab: [
    "Documentos pessoais (RG e CPF)",
    "Formulário de Inscrição e informações sobre a trajetória",
    "Comprovante de residência em Governador Edison Lobão",
    "Curriculum ou Portifólio Artístico",
    "Publicação do resultado final",
    "Certidões pessoa física ou jurídica"
  ]
};
const TINFO = {
  padrao: {
    label: "Anexo II",
    icon: "📄",
    cor: "#2563eb"
  },
  eng: {
    label: "NF Engenharia",
    icon: "🏗️",
    cor: "#7c3aed"
  },
  tdf: {
    label: "TFD",
    icon: "🏥",
    cor: "#0f766e"
  },
  passagem: {
    label: "Restituição Passagem",
    icon: "✈️",
    cor: "#d97706"
  },
  // Aldir Blanc / PNAB
  pnab: {
    label: "Aldir Blanc / PNAB",
    icon: "🎭",
    cor: "#be185d"
  }
};
const COL_CANON = {
  // Órgão / Secretaria
  "ORGAO": "ORGÃO",
  "SECRETARIA ORGAO": "ORGÃO",
  "ORGAO SECRETARIA": "ORGÃO",
  "UNIDADE": "ORGÃO",
  "DEPARTAMENTO": "ORGÃO",
  "SECRETARIA MUNICIPAL": "ORGÃO",
  // Secretário
  "SECRETARIO": "SECRETARIO",
  "ORDENADOR": "SECRETARIO",
  "GESTOR": "SECRETARIO",
  "RESPONSAVEL": "SECRETARIO",
  "ORDENADOR DE DESPESA": "SECRETARIO",
  // Fornecedor / Credor
  "FORNECEDOR": "FORNECEDOR",
  "EMPRESA": "FORNECEDOR",
  "CREDOR": "FORNECEDOR",
  "RAZAO SOCIAL": "FORNECEDOR",
  "NOME": "FORNECEDOR",
  "BENEFICIARIO": "FORNECEDOR",
  // CNPJ/CPF
  "CNPJ": "CNPJ",
  "CPF": "CNPJ",
  "CNPJ/CPF": "CNPJ",
  "CPF/CNPJ": "CNPJ",
  "CNPJ CPF": "CNPJ",
  "CPF CNPJ": "CNPJ",
  "INSCRICAO": "CNPJ",
  // Modalidade / Licitação
  "MODALIDADE": "MODALIDADE",
  "MODALIDADE LICITACAO": "MODALIDADE",
  "MODALIDADE LICITAÇÃO": "MODALIDADE",
  "TIPO LICITACAO": "MODALIDADE",
  // Contrato
  "CONTRATO": "CONTRATO",
  "NUMERO CONTRATO": "CONTRATO",
  "N CONTRATO": "CONTRATO",
  "Nº CONTRATO": "CONTRATO",
  "CONTRATO N": "CONTRATO",
  // Objeto
  "OBJETO": "OBJETO",
  "DESCRICAO": "OBJETO",
  "DESCRICAO DO OBJETO": "OBJETO",
  "SERVICO": "OBJETO",
  "PRODUTO": "OBJETO",
  "DESCRICAO SERVICO": "OBJETO",
  // Valor
  "VALOR": "VALOR",
  "VALOR TOTAL": "VALOR",
  "VALOR PAGO": "VALOR",
  "VALOR LIQUIDO": "VALOR",
  "VALOR BRUTO": "VALOR",
  "MONTANTE": "VALOR",
  // NF número (campo "Nº" salvo pelo sistema — chave exata)
  "Nº": "Nº",
  "N°": "Nº",
  "NF": "Nº",
  "NUMERO NF": "Nº",
  "Nº NF": "Nº",
  "NF/FATURA": "Nº",
  "NUMERO DA NF": "Nº",
  "NUMERO NOTA": "Nº",
  "NOTA FISCAL": "Nº",
  "NUMERO DOCUMENTO FISCAL": "Nº",
  "FATURA": "Nº",
  "NUMERO FATURA": "Nº",
  // Tipo NF
  "TIPO": "TIPO",
  "TIPO NF": "TIPO",
  "TIPO NOTA": "TIPO",
  "TIPO DOCUMENTO FISCAL": "TIPO",
  "ESPECIE": "TIPO",
  // Documento Fiscal (tipo do documento: NFS-e, NF, RPA...)
  "DOCUMENTO FISCAL": "DOCUMENTO FISCAL",
  "DOC FISCAL": "DOCUMENTO FISCAL",
  "TIPO DOCUMENTO": "DOCUMENTO FISCAL",
  "ESPECIE DOCUMENTO": "DOCUMENTO FISCAL",
  // Data NF
  "DATA NF": "DATA NF",
  "DATA DA NF": "DATA NF",
  "DATA NOTA": "DATA NF",
  "DATA EMISSAO": "DATA NF",
  "DATA EMISSÃO": "DATA NF",
  "EMISSAO": "DATA NF",
  // Número do processo / documento
  "NUMERO DO DOCUMENTO": "NÚMERO DO DOCUMENTO",
  "PROCESSO": "NÚMERO DO DOCUMENTO",
  "NUMERO PROCESSO": "NÚMERO DO DOCUMENTO",
  "N PROCESSO": "NÚMERO DO DOCUMENTO",
  "PROTOCOLO": "NÚMERO DO DOCUMENTO",
  "NUMERO": "NÚMERO DO DOCUMENTO",
  // Período de referência
  "PERIODO DE REFERENCIA": "PERÍODO DE REFERÊNCIA",
  "PERIODO": "PERÍODO DE REFERÊNCIA",
  "COMPETENCIA": "PERÍODO DE REFERÊNCIA",
  "REFERENCIA": "PERÍODO DE REFERÊNCIA",
  "MES REFERENCIA": "PERÍODO DE REFERÊNCIA",
  // Ordem de compra
  "N° ORDEM DE COMPRA": "N° ORDEM DE COMPRA",
  "ORDEM DE COMPRA": "N° ORDEM DE COMPRA",
  "N ORDEM": "N° ORDEM DE COMPRA",
  "ORDEM": "N° ORDEM DE COMPRA",
  "NUMERO ORDEM": "N° ORDEM DE COMPRA",
  "OC": "N° ORDEM DE COMPRA",
  // Nome fantasia
  "NOME FANTASIA": "NOME FANTASIA",
  "FANTASIA": "NOME FANTASIA",
  "APELIDO": "NOME FANTASIA",
  // Outros
  "SOLICITANTE": "SOLICITANTE",
  "CPF BENEFICIARIO": "CPF_BENEFICIARIO",
  "OBSERVACAO": "_obs",
  "OBSERVAÇÃO": "_obs",
  "OBS": "_obs",
  "NOTAS": "NOTAS",
  "NOTA INTERNA": "NOTAS",
  "DATA": "DATA",
  "DATA ATESTE": "DATA",
  "DATA DO ATESTE": "DATA"
};
const FOOTER_TXT = "RUA IMPERATRIZ II, Nº 800, CENTRO - GOV. EDISON LOBÃO/MA  |  CEP: 65.928-000";

// ── Cores municipais: Ouro #EFD103 | Verde #006000 | Azul #0040E0 ──
const MUN = {
  gold: "#EFD103",
  goldDk: "#b89d00",
  goldXdk: "#7a6500",
  green: "#006000",
  greenDk: "#003d00",
  greenXdk: "#001800",
  greenMid: "#1a4a1a",
  blue: "#0040E0",
  blueDk: "#002da0",
  blueXdk: "#001560"
};
const T = {
  // Modo claro: fundo creme-esverdeado suave
  appBg: "#f2f4f7",
  cardBg: "#ffffff",
  border: "#c8d8b8",
  textMain: "#1a2310",
  // Modo escuro: fundo verde-escuro profundo baseado nas cores do brasão
  appBgDark: "#1a2820",
  cardBgDark: "#1e3528",
  borderDark: "#005c1a",
  textMainDark: "#f0fae8",
  kpi1: "linear-gradient(135deg," + MUN.green + "," + MUN.greenDk + ")",
  kpi2: "linear-gradient(135deg," + MUN.blue + "," + MUN.blueDk + ")",
  kpi3: "linear-gradient(135deg,#c0392b,#7b241c)",
  kpi4: "linear-gradient(135deg," + MUN.gold + "," + MUN.goldDk + ")",
  kpi5: "linear-gradient(135deg,#1a9e4a,#0e6b30)"
};


// ─── [J-F4] Status de tramitação ─────────────────────────────────────────────
const STATUS_MAP = {
  analise:   { label: "Em análise",              cor: "#d97706", emoji: "🟡" },
  aguardando:{ label: "Aguardando complementação",cor: "#7c3aed", emoji: "🟣" },
  aprovado:  { label: "Aprovado p/ pagamento",   cor: "#16a34a", emoji: "🟢" },
  pago:      { label: "Pago",                    cor: "#0f172a", emoji: "⚫" },
  devolvido: { label: "Devolvido",               cor: "#dc2626", emoji: "🔴" }
};

