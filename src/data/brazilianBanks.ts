export interface BrazilianBank {
  code: string;
  name: string;
  fullName: string;
  color: string;
  suggestedBrand: 'MASTERCARD' | 'VISA' | 'ELO' | 'AMEX' | 'OUTRO';
  category: 'DIGITAL' | 'TRADICIONAL' | 'COOPERATIVA' | 'INVESTIMENTO' | 'FINTECH' | 'OUTRO';
  isPopular?: boolean;
}

export const BRAZILIAN_BANKS: BrazilianBank[] = [
  // Bancos Populares / Digitais Mais Usados
  {
    code: '260',
    name: 'Nubank',
    fullName: 'Nu Pagamentos S.A. - Instituição de Pagamento',
    color: '#820ad1',
    suggestedBrand: 'MASTERCARD',
    category: 'DIGITAL',
    isPopular: true
  },
  {
    code: '341',
    name: 'Itaú Unibanco',
    fullName: 'Itaú Unibanco S.A.',
    color: '#ec7000',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL',
    isPopular: true
  },
  {
    code: '001',
    name: 'Banco do Brasil',
    fullName: 'Banco do Brasil S.A.',
    color: '#003882',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL',
    isPopular: true
  },
  {
    code: '237',
    name: 'Bradesco',
    fullName: 'Banco Bradesco S.A.',
    color: '#cc092f',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL',
    isPopular: true
  },
  {
    code: '033',
    name: 'Santander',
    fullName: 'Banco Santander (Brasil) S.A.',
    color: '#ec0000',
    suggestedBrand: 'MASTERCARD',
    category: 'TRADICIONAL',
    isPopular: true
  },
  {
    code: '104',
    name: 'Caixa Econômica Federal',
    fullName: 'Caixa Econômica Federal',
    color: '#0066b3',
    suggestedBrand: 'ELO',
    category: 'TRADICIONAL',
    isPopular: true
  },
  {
    code: '077',
    name: 'Banco Inter',
    fullName: 'Banco Inter S.A.',
    color: '#ff7a00',
    suggestedBrand: 'MASTERCARD',
    category: 'DIGITAL',
    isPopular: true
  },
  {
    code: '336',
    name: 'C6 Bank',
    fullName: 'Banco C6 S.A.',
    color: '#242424',
    suggestedBrand: 'MASTERCARD',
    category: 'DIGITAL',
    isPopular: true
  },
  {
    code: '208',
    name: 'BTG Pactual',
    fullName: 'Banco BTG Pactual S.A.',
    color: '#0a2540',
    suggestedBrand: 'MASTERCARD',
    category: 'INVESTIMENTO',
    isPopular: true
  },
  {
    code: '756',
    name: 'Sicoob',
    fullName: 'Banco Cooperativo Sicoob S.A. - BANCOOB',
    color: '#003641',
    suggestedBrand: 'MASTERCARD',
    category: 'COOPERATIVA',
    isPopular: true
  },
  {
    code: '748',
    name: 'Sicredi',
    fullName: 'Banco Cooperativo Sicredi S.A.',
    color: '#00843d',
    suggestedBrand: 'MASTERCARD',
    category: 'COOPERATIVA',
    isPopular: true
  },
  {
    code: '323',
    name: 'Mercado Pago',
    fullName: 'Mercado Pago Instituição de Pagamento Ltda.',
    color: '#009ee3',
    suggestedBrand: 'VISA',
    category: 'FINTECH',
    isPopular: true
  },
  {
    code: '290',
    name: 'PagBank / PagSeguro',
    fullName: 'PagBank - PagSeguro Internet Instituição de Pagamento S.A.',
    color: '#00a868',
    suggestedBrand: 'VISA',
    category: 'FINTECH',
    isPopular: true
  },
  {
    code: '197',
    name: 'Stone / Ton',
    fullName: 'Stone Instituição de Pagamento S.A.',
    color: '#00a868',
    suggestedBrand: 'MASTERCARD',
    category: 'FINTECH',
    isPopular: true
  },
  {
    code: '403',
    name: 'Cora SCD',
    fullName: 'Cora Sociedade de Crédito Direto S.A.',
    color: '#fe3e6d',
    suggestedBrand: 'VISA',
    category: 'DIGITAL',
    isPopular: true
  },
  {
    code: '735',
    name: 'Banco Neon',
    fullName: 'Neon Pagamentos S.A. / Banco Votorantim',
    color: '#00e5ff',
    suggestedBrand: 'VISA',
    category: 'DIGITAL',
    isPopular: true
  },
  {
    code: '102',
    name: 'XP Investimentos',
    fullName: 'XP Investimentos CCTVM S.A.',
    color: '#18181b',
    suggestedBrand: 'VISA',
    category: 'INVESTIMENTO',
    isPopular: true
  },

  // Demais Bancos Comerciais e Estaduais
  {
    code: '422',
    name: 'Banco Safra',
    fullName: 'Banco Safra S.A.',
    color: '#1c2b39',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL'
  },
  {
    code: '041',
    name: 'Banrisul',
    fullName: 'Banco do Estado do Rio Grande do Sul S.A.',
    color: '#005ca9',
    suggestedBrand: 'MASTERCARD',
    category: 'TRADICIONAL'
  },
  {
    code: '004',
    name: 'Banco do Nordeste (BNB)',
    fullName: 'Banco do Nordeste do Brasil S.A.',
    color: '#c4161c',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL'
  },
  {
    code: '003',
    name: 'Banco da Amazônia (BASA)',
    fullName: 'Banco da Amazônia S.A.',
    color: '#005028',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL'
  },
  {
    code: '318',
    name: 'Banco BMG',
    fullName: 'Banco BMG S.A.',
    color: '#ff6600',
    suggestedBrand: 'MASTERCARD',
    category: 'TRADICIONAL'
  },
  {
    code: '655',
    name: 'Banco BV',
    fullName: 'Banco Votorantim S.A.',
    color: '#003399',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL'
  },
  {
    code: '707',
    name: 'Banco Daycoval',
    fullName: 'Banco Daycoval S.A.',
    color: '#004071',
    suggestedBrand: 'MASTERCARD',
    category: 'TRADICIONAL'
  },
  {
    code: '623',
    name: 'Banco Pan',
    fullName: 'Banco Pan S.A.',
    color: '#00a4e4',
    suggestedBrand: 'VISA',
    category: 'DIGITAL'
  },
  {
    code: '212',
    name: 'Banco Original / PicPay',
    fullName: 'Banco Original S.A. / PicPay Bank',
    color: '#11c76f',
    suggestedBrand: 'MASTERCARD',
    category: 'DIGITAL'
  },
  {
    code: '461',
    name: 'Asaas Gestão Financeira',
    fullName: 'Asaas Gestão Financeira Instituição de Pagamento S.A.',
    color: '#0030b8',
    suggestedBrand: 'VISA',
    category: 'FINTECH'
  },
  {
    code: '246',
    name: 'Banco ABC Brasil',
    fullName: 'Banco ABC Brasil S.A.',
    color: '#004b87',
    suggestedBrand: 'VISA',
    category: 'INVESTIMENTO'
  },
  {
    code: '643',
    name: 'Banco Pine',
    fullName: 'Banco Pine S.A.',
    color: '#00552b',
    suggestedBrand: 'MASTERCARD',
    category: 'INVESTIMENTO'
  },
  {
    code: '633',
    name: 'Banco Rendimento',
    fullName: 'Banco Rendimento S.A.',
    color: '#1a3668',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL'
  },
  {
    code: '746',
    name: 'Banco Modal',
    fullName: 'Banco Modal S.A.',
    color: '#0a1c2e',
    suggestedBrand: 'VISA',
    category: 'INVESTIMENTO'
  },
  {
    code: '085',
    name: 'Ailos / Viacredi',
    fullName: 'Cooperativa Central de Crédito Urbano - AILOS',
    color: '#005696',
    suggestedBrand: 'MASTERCARD',
    category: 'COOPERATIVA'
  },
  {
    code: '084',
    name: 'Uniprime',
    fullName: 'Uniprime do Brasil - Cooperativa Central',
    color: '#17433c',
    suggestedBrand: 'MASTERCARD',
    category: 'COOPERATIVA'
  },
  {
    code: '133',
    name: 'Cresol',
    fullName: 'Cresol Confederação',
    color: '#e87722',
    suggestedBrand: 'MASTERCARD',
    category: 'COOPERATIVA'
  },
  {
    code: '070',
    name: 'BRB - Banco de Brasília',
    fullName: 'BRB - Banco de Brasília S.A.',
    color: '#005596',
    suggestedBrand: 'MASTERCARD',
    category: 'TRADICIONAL'
  },
  {
    code: '021',
    name: 'BANESTES',
    fullName: 'BANESTES S.A. Banco do Estado do Espírito Santo',
    color: '#004b87',
    suggestedBrand: 'VISA',
    category: 'TRADICIONAL'
  },
  {
    code: '047',
    name: 'Banco do Estado de Sergipe (Banese)',
    fullName: 'Banco do Estado de Sergipe S.A.',
    color: '#00703c',
    suggestedBrand: 'ELO',
    category: 'TRADICIONAL'
  },
  {
    code: '074',
    name: 'Banco J. Safra',
    fullName: 'Banco J. Safra S.A.',
    color: '#1c2b39',
    suggestedBrand: 'VISA',
    category: 'INVESTIMENTO'
  },
  {
    code: '218',
    name: 'Banco BS2',
    fullName: 'Banco BS2 S.A.',
    color: '#002f6c',
    suggestedBrand: 'VISA',
    category: 'DIGITAL'
  },
  {
    code: '637',
    name: 'Banco Sofisa',
    fullName: 'Banco Sofisa S.A.',
    color: '#d6001c',
    suggestedBrand: 'MASTERCARD',
    category: 'DIGITAL'
  },
  {
    code: '654',
    name: 'Banco Digimais',
    fullName: 'Banco Digimais S.A.',
    color: '#00b0ff',
    suggestedBrand: 'VISA',
    category: 'DIGITAL'
  },
  {
    code: '380',
    name: 'PicPay Instituição de Pagamento',
    fullName: 'PicPay Instituição de Pagamento S.A.',
    color: '#11c76f',
    suggestedBrand: 'MASTERCARD',
    category: 'FINTECH'
  },
  {
    code: '301',
    name: 'Dock Instituição de Pagamento',
    fullName: 'Dock IP S.A.',
    color: '#0f172a',
    suggestedBrand: 'MASTERCARD',
    category: 'FINTECH'
  },
  {
    code: '999',
    name: 'InfinitePay / CloudWalk',
    fullName: 'Cloudwalk Meios de Pagamento e Instituição de Pagamento Ltda.',
    color: '#18181b',
    suggestedBrand: 'MASTERCARD',
    category: 'FINTECH'
  },
  {
    code: '000',
    name: 'Outro Banco / Emissor Personalizado',
    fullName: 'Instituição Bancária Personalizada',
    color: '#64748b',
    suggestedBrand: 'OUTRO',
    category: 'OUTRO'
  }
];

export const POPULAR_BANKS_FOR_CARDS = BRAZILIAN_BANKS.filter(b => b.isPopular);

export function findBankByTerm(term: string): BrazilianBank | undefined {
  if (!term || !term.trim()) return undefined;
  const clean = term.trim().toLowerCase();

  return BRAZILIAN_BANKS.find(b => 
    b.code === clean ||
    b.name.toLowerCase() === clean ||
    b.name.toLowerCase().includes(clean) ||
    b.fullName.toLowerCase().includes(clean)
  );
}
