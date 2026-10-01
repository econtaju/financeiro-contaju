/**
 * Precision Calculator Engine
 * 
 * Implements deterministic standard computer/desktop calculator logic:
 * - Arithmetic (+, -, *, /) with precision float cleaning
 * - Percentage (%) supporting commercial markup/markdown (100 + 10% = 110, 200 * 15% = 30)
 * - Sign inversion (±)
 * - Backspace, Clear (C) and Clear Entry (CE)
 * - Memory registers (MC, MR, M+, M-)
 * - History tape of past calculations
 */

export type CalculatorOperator = '+' | '-' | '*' | '/' | null;

export interface CalculatorHistoryItem {
  id: string;
  expression: string;
  result: number;
  timestamp: string;
}

export interface CalculatorState {
  display: string; // Current string in main display (e.g. "0", "123.45")
  previousValue: number | null; // Operand stored before operator
  operator: CalculatorOperator; // Current pending operator
  waitingForNewOperand: boolean; // True after pressing operator, next digit starts fresh number
  memory: number; // Stored memory value
  history: CalculatorHistoryItem[]; // Tape of recent calculations
  lastOperation?: {
    operator: CalculatorOperator;
    operand: number;
  };
}

/**
 * Eliminates JavaScript floating point anomalies (e.g. 0.1 + 0.2 = 0.30000000000000004)
 */
export function cleanFloat(num: number, precision: number = 12): number {
  if (!isFinite(num) || isNaN(num)) return 0;
  return parseFloat(num.toPrecision(precision));
}

/**
 * Evaluates binary arithmetic with safe float precision
 */
export function executeMath(a: number, b: number, op: CalculatorOperator): number {
  if (!op) return b;
  let res = 0;
  switch (op) {
    case '+':
      res = a + b;
      break;
    case '-':
      res = a - b;
      break;
    case '*':
      res = a * b;
      break;
    case '/':
      if (b === 0) {
        throw new Error('Divisão por zero');
      }
      res = a / b;
      break;
    default:
      res = b;
  }
  return cleanFloat(res);
}

/**
 * Formats a calculator display number string into Brazilian localized format
 * Preserves trailing dots and zeros while user is typing (e.g. "1250." -> "1.250,")
 */
export function formatCalculatorNumber(valueStr: string): string {
  if (valueStr === 'Erro' || valueStr === 'Divisão por zero') {
    return valueStr;
  }
  if (!valueStr) return '0';

  const isNegative = valueStr.startsWith('-');
  const cleanStr = isNegative ? valueStr.slice(1) : valueStr;

  const parts = cleanStr.split('.');
  const intPart = parts[0] || '0';
  const hasDot = cleanStr.includes('.');
  const decPart = parts[1];

  // Format integer part with thousands separators
  const formattedInt = Number(intPart).toLocaleString('pt-BR');

  let result = (isNegative ? '-' : '') + formattedInt;

  if (hasDot) {
    result += ',';
    if (decPart !== undefined) {
      result += decPart;
    }
  }

  return result;
}

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  display: '0',
  previousValue: null,
  operator: null,
  waitingForNewOperand: false,
  memory: 0,
  history: []
};

/**
 * Main state transition reducer for calculator actions
 */
export function calculatorReducer(
  state: CalculatorState,
  action:
    | { type: 'INPUT_DIGIT'; digit: string }
    | { type: 'INPUT_DECIMAL' }
    | { type: 'SET_OPERATOR'; operator: CalculatorOperator }
    | { type: 'CALCULATE' }
    | { type: 'PERCENTAGE' }
    | { type: 'TOGGLE_SIGN' }
    | { type: 'BACKSPACE' }
    | { type: 'CLEAR_ENTRY' }
    | { type: 'CLEAR_ALL' }
    | { type: 'MEMORY_CLEAR' }
    | { type: 'MEMORY_RECALL' }
    | { type: 'MEMORY_ADD' }
    | { type: 'MEMORY_SUBTRACT' }
    | { type: 'SET_VALUE'; value: number }
    | { type: 'CLEAR_HISTORY' }
): CalculatorState {
  try {
    switch (action.type) {
      case 'INPUT_DIGIT': {
        const { digit } = action;
        if (state.display === 'Erro') {
          return { ...state, display: digit, waitingForNewOperand: false };
        }

        if (state.waitingForNewOperand) {
          return {
            ...state,
            display: digit,
            waitingForNewOperand: false
          };
        }

        const newDisplay = state.display === '0' ? digit : state.display + digit;
        // Limit to 16 digits to prevent display overflow
        if (newDisplay.replace(/[^\d]/g, '').length > 16) {
          return state;
        }

        return {
          ...state,
          display: newDisplay
        };
      }

      case 'INPUT_DECIMAL': {
        if (state.display === 'Erro' || state.waitingForNewOperand) {
          return {
            ...state,
            display: '0.',
            waitingForNewOperand: false
          };
        }

        if (state.display.includes('.')) {
          return state; // Only one decimal separator allowed
        }

        return {
          ...state,
          display: state.display + '.'
        };
      }

      case 'SET_OPERATOR': {
        const { operator } = action;
        const currentNum = parseFloat(state.display) || 0;

        if (state.previousValue === null) {
          return {
            ...state,
            previousValue: currentNum,
            operator,
            waitingForNewOperand: true,
            lastOperation: undefined
          };
        }

        if (state.waitingForNewOperand) {
          // If operator pressed consecutively, simply change operator
          return {
            ...state,
            operator
          };
        }

        // Execute pending operation
        const calculated = executeMath(state.previousValue, currentNum, state.operator);
        return {
          ...state,
          display: String(calculated),
          previousValue: calculated,
          operator,
          waitingForNewOperand: true,
          lastOperation: undefined
        };
      }

      case 'CALCULATE': {
        const currentNum = parseFloat(state.display) || 0;

        // If repeating '=' consecutively with previous lastOperation
        if (state.operator === null && state.lastOperation) {
          const res = executeMath(currentNum, state.lastOperation.operand, state.lastOperation.operator);
          return {
            ...state,
            display: String(res),
            previousValue: null
          };
        }

        if (state.operator === null || state.previousValue === null) {
          return state;
        }

        const result = executeMath(state.previousValue, currentNum, state.operator);
        const expression = `${formatCalculatorNumber(String(state.previousValue))} ${state.operator} ${formatCalculatorNumber(String(currentNum))} =`;

        const newHistoryItem: CalculatorHistoryItem = {
          id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          expression,
          result,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        return {
          ...state,
          display: String(result),
          previousValue: null,
          operator: null,
          waitingForNewOperand: true,
          lastOperation: {
            operator: state.operator,
            operand: currentNum
          },
          history: [newHistoryItem, ...state.history.slice(0, 49)] // Keep last 50
        };
      }

      case 'PERCENTAGE': {
        const currentNum = parseFloat(state.display) || 0;

        if (state.previousValue === null || state.operator === null) {
          // Standard standalone percentage: 50% = 0.5
          const res = cleanFloat(currentNum / 100);
          return {
            ...state,
            display: String(res),
            waitingForNewOperand: true
          };
        }

        // Real financial/commercial calculator percentage behavior:
        // 100 + 10% -> 10 (which turns into 110 upon pressing =)
        // 500 - 20% -> 100 (which turns into 400 upon pressing =)
        // 200 * 15% -> 30
        let percentValue = 0;
        if (state.operator === '+' || state.operator === '-') {
          percentValue = cleanFloat((state.previousValue * currentNum) / 100);
        } else {
          percentValue = cleanFloat(currentNum / 100);
        }

        return {
          ...state,
          display: String(percentValue)
        };
      }

      case 'TOGGLE_SIGN': {
        if (state.display === '0' || state.display === 'Erro') return state;
        const num = parseFloat(state.display) || 0;
        const negated = cleanFloat(-num);
        return {
          ...state,
          display: String(negated)
        };
      }

      case 'BACKSPACE': {
        if (state.waitingForNewOperand || state.display === 'Erro') {
          return state;
        }

        if (state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-'))) {
          return {
            ...state,
            display: '0'
          };
        }

        return {
          ...state,
          display: state.display.slice(0, -1)
        };
      }

      case 'CLEAR_ENTRY': {
        return {
          ...state,
          display: '0'
        };
      }

      case 'CLEAR_ALL': {
        return {
          ...INITIAL_CALCULATOR_STATE,
          memory: state.memory,
          history: state.history
        };
      }

      case 'MEMORY_CLEAR': {
        return {
          ...state,
          memory: 0
        };
      }

      case 'MEMORY_RECALL': {
        return {
          ...state,
          display: String(state.memory),
          waitingForNewOperand: true
        };
      }

      case 'MEMORY_ADD': {
        const current = parseFloat(state.display) || 0;
        return {
          ...state,
          memory: cleanFloat(state.memory + current),
          waitingForNewOperand: true
        };
      }

      case 'MEMORY_SUBTRACT': {
        const current = parseFloat(state.display) || 0;
        return {
          ...state,
          memory: cleanFloat(state.memory - current),
          waitingForNewOperand: true
        };
      }

      case 'SET_VALUE': {
        return {
          ...state,
          display: String(cleanFloat(action.value)),
          waitingForNewOperand: true
        };
      }

      case 'CLEAR_HISTORY': {
        return {
          ...state,
          history: []
        };
      }

      default:
        return state;
    }
  } catch (err: any) {
    return {
      ...state,
      display: 'Erro',
      previousValue: null,
      operator: null,
      waitingForNewOperand: true
    };
  }
}
