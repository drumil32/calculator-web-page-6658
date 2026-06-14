const display = document.querySelector('#display');
const keypad = document.querySelector('.keypad');

let expression = '';
let lastExpression = '';
let lastResult = '';
let justEvaluated = false;
let invalidState = false;

const operatorSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

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
    expression += number === '' || expression.endsWith('-') && isOperator(expression.at(-2)) ? '0.' : '.';
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
  lastResult = '';
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

function formatResult(number) {
  if (!Number.isFinite(number)) throw new Error('Invalid result');
  const rounded = Number.parseFloat(number.toPrecision(12));
  return String(rounded);
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
    lastResult = result;
    expression = result;
    justEvaluated = true;
    invalidState = false;
    updateDisplay(result);
  } catch (error) {
    expression = '';
    justEvaluated = false;
    invalidState = true;
    display.textContent = error.message.includes('zero') ? 'Cannot divide by zero' : 'Error';
  }
}

keypad.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.value) appendValue(button.dataset.value);
  if (button.dataset.action === 'clear') clearCalculator();
  if (button.dataset.action === 'delete') deleteLast();
  if (button.dataset.action === 'equals') equals();
});

document.addEventListener('keydown', event => {
  const key = event.key;
  if (/\d/.test(key)) appendValue(key);
  else if (key === '.') appendValue('.');
  else if (['+', '-', '*', '/'].includes(key)) appendValue(key);
  else if (key === 'Enter' || key === '=') equals();
  else if (key === 'Backspace') deleteLast();
  else if (key === 'Escape' || key.toLowerCase() === 'c') clearCalculator();
  else return;

  event.preventDefault();
});

updateDisplay();
