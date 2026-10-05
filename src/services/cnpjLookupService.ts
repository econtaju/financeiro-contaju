import { cleanDocumentDigits, isValidCNPJ, maskCNPJOnly } from '../utils/cnpjValidator';

export interface CNPJCompanyData {
  cnpj: string;
  formattedCnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  cnaeCodigo: string;
  cnaeDescricao: string;
  enderecoCompleto: string;
}

const CNPJ_CACHE_KEY = 'contaju_cnpj_cache_v1';

function getCnpjCache(): Record<string, CNPJCompanyData> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CNPJ_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCnpjCache(digits: string, data: CNPJCompanyData): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const current = getCnpjCache();
    current[digits] = data;
    localStorage.setItem(CNPJ_CACHE_KEY, JSON.stringify(current));
  } catch {
    // quota exceeded ou indisponível
  }
}

/**
 * Consulta dados cadastrais oficiais de uma empresa via BrasilAPI (Receita Federal)
 * com fallback para MinhaReceita em caso de instabilidade.
 */
export async function lookupCNPJ(rawCnpj: string): Promise<CNPJCompanyData | null> {
  const digits = cleanDocumentDigits(rawCnpj);

  if (digits.length !== 14 || !isValidCNPJ(digits)) {
    return null;
  }

  // 1. Verifica cache local
  const cache = getCnpjCache();
  if (cache[digits]) {
    return cache[digits];
  }

  // 2. Consulta BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      const logradouro = data.logradouro || '';
      const numero = data.numero || 'S/N';
      const complemento = data.complemento ? ` - ${data.complemento}` : '';
      const bairro = data.bairro || '';
      const municipio = data.municipio || '';
      const uf = data.uf || '';
      const cep = data.cep ? data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '';

      const enderecoParts = [
        logradouro ? `${logradouro}, ${numero}${complemento}` : '',
        bairro,
        municipio && uf ? `${municipio}/${uf}` : municipio,
        cep ? `CEP: ${cep}` : ''
      ].filter(Boolean);

      const tel = data.ddd_telefone_1 ? (
        data.ddd_telefone_1.length === 10
          ? data.ddd_telefone_1.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
          : data.ddd_telefone_1.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
      ) : '';

      const companyData: CNPJCompanyData = {
        cnpj: digits,
        formattedCnpj: maskCNPJOnly(digits),
        razaoSocial: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || data.razao_social || '',
        situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
        logradouro,
        numero,
        complemento: data.complemento || '',
        bairro,
        municipio,
        uf,
        cep,
        telefone: tel,
        email: data.email || '',
        cnaeCodigo: String(data.cnae_fiscal || ''),
        cnaeDescricao: data.cnae_fiscal_descricao || '',
        enderecoCompleto: enderecoParts.join(' - ')
      };

      saveCnpjCache(digits, companyData);
      return companyData;
    }
  } catch (err) {
    console.warn(`[CNPJ Lookup] BrasilAPI indisponível para CNPJ ${digits}, tentando fallback:`, err);
  }

  // 3. Fallback: MinhaReceita
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const fallbackResponse = await fetch(`https://minhareceita.org/${digits}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();

      const logradouro = data.logradouro || '';
      const numero = data.numero || 'S/N';
      const complemento = data.complemento ? ` - ${data.complemento}` : '';
      const bairro = data.bairro || '';
      const municipio = data.municipio || '';
      const uf = data.uf || '';
      const cep = data.cep ? String(data.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') : '';

      const enderecoParts = [
        logradouro ? `${logradouro}, ${numero}${complemento}` : '',
        bairro,
        municipio && uf ? `${municipio}/${uf}` : municipio,
        cep ? `CEP: ${cep}` : ''
      ].filter(Boolean);

      const tel = data.ddd_telefone_1 ? `(${data.ddd_telefone_1})` : '';

      const companyData: CNPJCompanyData = {
        cnpj: digits,
        formattedCnpj: maskCNPJOnly(digits),
        razaoSocial: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || data.razao_social || '',
        situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
        logradouro,
        numero,
        complemento: data.complemento || '',
        bairro,
        municipio,
        uf,
        cep,
        telefone: tel,
        email: data.email || '',
        cnaeCodigo: String(data.cnae_fiscal || ''),
        cnaeDescricao: data.cnae_fiscal_descricao || '',
        enderecoCompleto: enderecoParts.join(' - ')
      };

      saveCnpjCache(digits, companyData);
      return companyData;
    }
  } catch (fallbackErr) {
    console.warn(`[CNPJ Lookup] Fallback também indisponível para CNPJ ${digits}:`, fallbackErr);
  }

  return null;
}
