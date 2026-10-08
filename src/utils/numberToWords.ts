/**
 * Converte valor numérico em reais para extenso em português do Brasil.
 * Exemplo: 1250.50 -> "um mil, duzentos e cinquenta reais e cinquenta centavos"
 */

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'
];

const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'
];

const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
];

function converterGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;

  const partes: string[] = [];

  if (c > 0) {
    partes.push(CENTENAS[c]);
  }

  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]);
    } else {
      partes.push(DEZENAS[d]);
      if (u > 0) {
        partes.push(UNIDADES[u]);
      }
    }
  }

  return partes.join(' e ');
}

export function numberToWordsBRL(valor: number): string {
  if (!valor || valor <= 0) return 'zero reais';

  const valorFixado = valor.toFixed(2);
  const [inteiroStr, centavosStr] = valorFixado.split('.');
  const inteiro = parseInt(inteiroStr, 10);
  const centavos = parseInt(centavosStr, 10);

  const partesTexto: string[] = [];

  if (inteiro > 0) {
    const bilhoes = Math.floor(inteiro / 1_000_000_000);
    const milhoes = Math.floor((inteiro % 1_000_000_000) / 1_000_000);
    const milhares = Math.floor((inteiro % 1_000_000) / 1_000);
    const unidades = inteiro % 1_000;

    if (bilhoes > 0) {
      partesTexto.push(`${converterGrupo(bilhoes)} ${bilhoes === 1 ? 'bilhão' : 'bilhões'}`);
    }

    if (milhoes > 0) {
      partesTexto.push(`${converterGrupo(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
    }

    if (milhares > 0) {
      if (milhares === 1) {
        partesTexto.push('um mil');
      } else {
        partesTexto.push(`${converterGrupo(milhares)} mil`);
      }
    }

    if (unidades > 0) {
      partesTexto.push(converterGrupo(unidades));
    }

    const textoReais = partesTexto.join(', ');
    const singular = inteiro === 1;
    partesTexto.length = 0;
    partesTexto.push(`${textoReais} ${singular ? 'real' : 'reais'}`);
  }

  if (centavos > 0) {
    const textoCentavos = converterGrupo(centavos);
    const singularCentavos = centavos === 1;
    if (inteiro > 0) {
      partesTexto.push(` e ${textoCentavos} ${singularCentavos ? 'centavo' : 'centavos'}`);
    } else {
      partesTexto.push(`${textoCentavos} ${singularCentavos ? 'centavo' : 'centavos'}`);
    }
  }

  return partesTexto.join('').trim();
}
