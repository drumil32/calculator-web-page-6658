const display = document.querySelector('#display');
const keypad = document.querySelector('.keypad');
const themeToggle = document.querySelector('#theme-toggle');
const root = document.documentElement;

let expression = '';
let lastExpression = '';
let justEvaluated = false;
let invalidState = false;

const operatorSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
const storageKey = 'calculator-theme';

function getStoredTheme() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Storage may be unavailable; theme still changes for this session.
  }
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.querySelector('.theme-toggle__icon').textContent = isDark ? '☾' : '☀';
  themeToggle.querySelector('.theme-toggle__text').textContent = isDark ? 'Dark' : 'Light';
}

function initTheme() {
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(getStoredTheme() || preferred);
}

function updateDisplay(value = expression) {
  display.textContent = value ? formatForDisplay(value) : '0';
}

function formatForDisplay(value) {
  return String(value).replace(/[+\-*/]/g, match => operatorSymbols[match] || match);
}

function isOperator(token) {
  return ['+', '-', '*', '/'].includes(token);
}

function currentNumber() {
  const match = expression.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
  return match ? match[1] : '';
}

function appendValue(value) {
  if (invalidState) clearCalculator();

  if (/\d/.test(value)) {
    if (justEvaluated) {
      expression = '';
      justEvaluated = false;
    }
    expression += value;
    updateDisplay();
    return;
  }

  if (value === '.') {
    if (justEvaluated) {
      expression = '0';
      justEvaluated = false;
    }
    const number = currentNumber();
    if (number.includes('.')) return;
    expression += number === '' || (expression.endsWith('-') && isOperator(expression.at(-2))) ? '0.' : '.';
    updateDisplay();
    return;
  }

  if (isOperator(value)) addOperator(value);
}

function addOperator(operator) {
  if (invalidState) clearCalculator();
  if (justEvaluated) justEvaluated = false;

  if (!expression) {
    if (operator === '-') expression = '-';
    updateDisplay();
    return;
  }

  const last = expression.at(-1);
  if (isOperator(last)) {
    if (operator === '-' && last !== '-') expression += operator;
    else expression = expression.slice(0, -1) + operator;
  } else if (last === '.') {
    expression = expression.slice(0, -1) + operator;
  } else {
    expression += operator;
  }
  updateDisplay();
}

function clearCalculator() {
  expression = '';
  lastExpression = '';
  justEvaluated = false;
  invalidState = false;
  updateDisplay();
}

function deleteLast() {
  if (invalidState || justEvaluated) {
    clearCalculator();
    return;
  }
  expression = expression.slice(0, -1);
  updateDisplay();
}

function tokenize(input) {
  const tokens = [];
  let number = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const prev = input[i - 1];

    if (/\d|\./.test(char) || (char === '-' && (i === 0 || isOperator(prev)))) {
      number += char;
    } else if (isOperator(char)) {
      if (number === '' || number === '-') throw new Error('Invalid expression');
      tokens.push(Number(number), char);
      number = '';
    }
  }

  if (number === '' || number === '-') throw new Error('Invalid expression');
  tokens.push(Number(number));
  if (tokens.some(token => typeof token === 'number' && Number.isNaN(token))) throw new Error('Invalid expression');
  return tokens;
}

function evaluateTokens(tokens) {
  const values = [];
  const ops = [];

  function applyOperator() {
    const operator = ops.pop();
    const b = values.pop();
    const a = values.pop();
    if (operator === '/' && b === 0) throw new Error('Cannot divide by zero');
    const result = { '+': a + b, '-': a - b, '*': a * b, '/': a / b }[operator];
    values.push(result);
  }

  for (const token of tokens) {
    if (typeof token === 'number') {
      values.push(token);
    } else {
      while (ops.length && precedence[ops.at(-1)] >= precedence[token]) applyOperator();
      ops.push(token);
    }
  }

  while (ops.length) applyOperator();
  return values[0];
}

function getExpressionValue() {
  let input = expression.replace(/[+\-*/.]$/, '');
  if (!input) return 0;
  return evaluateTokens(tokenize(input));
}

function formatResult(number) {
  if (!Number.isFinite(number)) throw new Error('Invalid result');
  const rounded = Number.parseFloat(number.toPrecision(12));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function showError(message) {
  expression = '';
  justEvaluated = false;
  invalidState = true;
  display.textContent = message;
}

function equals() {
  try {
    let input = expression;
    if (justEvaluated && lastExpression) input = lastExpression;
    if (!input) return;

    input = input.replace(/[+\-*/.]$/, '');
    if (!input) return;

    const result = formatResult(evaluateTokens(tokenize(input)));
    lastExpression = input;
    expression = result;
    justEvaluated = true;
    invalidState = false;
    updateDisplay(result);
  } catch (error) {
    showError(error.message.includes('zero') ? 'Cannot divide by zero' : 'Error');
  }
}

function applyAdvancedOperation(operation) {
  try {
    if (invalidState) clearCalculator();
    const value = getExpressionValue();
    let result;

    if (operation === 'percent') result = value / 100;
    if (operation === 'sqrt') {
      if (value < 0) throw new Error('Negative square root');
      result = Math.sqrt(value);
    }
    if (operation === 'square') result = value * value;
    if (operation === 'reciprocal') {
      if (value === 0) throw new Error('Cannot divide by zero');
      result = 1 / value;
    }

    expression = formatResult(result);
    lastExpression = '';
    justEvaluated = true;
    invalidState = false;
    updateDisplay(expression);
  } catch (error) {
    if (error.message.includes('Negative')) showError('Invalid √');
    else if (error.message.includes('zero')) showError('Cannot divide by zero');
    else showError('Error');
  }
}

keypad.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.value) appendValue(button.dataset.value);
  if (button.dataset.advanced) applyAdvancedOperation(button.dataset.advanced);
  if (button.dataset.action === 'clear') clearCalculator();
  if (button.dataset.action === 'delete') deleteLast();
  if (button.dataset.action === 'equals') equals();
});

themeToggle.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  storeTheme(nextTheme);
});

document.addEventListener('keydown', event => {
  const key = event.key;
  if (/\d/.test(key)) appendValue(key);
  else if (key === '.') appendValue('.');
  else if (['+', '-', '*', '/'].includes(key)) appendValue(key);
  else if (key === 'Enter' || key === '=') equals();
  else if (key === 'Backspace') deleteLast();
  else if (key === 'Escape' || key.toLowerCase() === 'c') clearCalculator();
  else if (key === '%') applyAdvancedOperation('percent');
  else if (key.toLowerCase() === 'r') applyAdvancedOperation('sqrt');
  else if (key.toLowerCase() === 's') applyAdvancedOperation('square');
  else if (key.toLowerCase() === 'i') applyAdvancedOperation('reciprocal');
  else return;

  event.preventDefault();
});

initTheme();
updateDisplay();
