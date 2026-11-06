'use strict';

/* =========================================================
   Caderneta — controle financeiro pessoal
   Dados salvos no localStorage. Valores guardados em centavos
   (inteiros) para evitar erros de arredondamento.
   ========================================================= */

const STORAGE_KEY = 'caderneta:v1';

const CATEGORIES = {
  saida: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Contas', 'Outros'],
  entrada: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (id) => document.getElementById(id);

/* ---------- utilidades ---------- */

function pad(n) { return String(n).padStart(2, '0'); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentMonth() { return todayISO().slice(0, 7); }

function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** "1.234,56" | "1234.56" | "R$ 12,5" -> centavos (ou null se inválido). */
function parseMoney(text) {
  let s = String(text).replace(/[R$\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 ? cents : null;
}

function formatDateBR(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function isValidItem(i) {
  return i && typeof i === 'object'
    && typeof i.id === 'string'
    && (i.type === 'entrada' || i.type === 'saida')
    && typeof i.desc === 'string'
    && Number.isInteger(i.cents) && i.cents > 0
    && typeof i.category === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(i.date);
}

/* ---------- armazenamento ---------- */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isValidItem) : [];
  } catch (e) {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch (e) {
    toast('Não foi possível salvar. O armazenamento do navegador pode estar bloqueado.');
  }
}

/* ---------- estado ---------- */

const state = {
  items: load(),
  month: currentMonth(),
  editingId: null,
};

/* ---------- elementos ---------- */

const form = $('txForm');
const fDesc = $('fDesc');
const fValue = $('fValue');
const fDate = $('fDate');
const fCat = $('fCat');
const formError = $('formError');
const submitBtn = $('submitBtn');
const cancelEdit = $('cancelEdit');

function selectedType() {
  return form.elements.type.value;
}

function fillCategories(selected) {
  fCat.replaceChildren();
  CATEGORIES[selectedType()].forEach((c) => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    fCat.appendChild(o);
  });
  if (selected) fCat.value = selected;
}

/* ---------- feedback ---------- */

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

/* ---------- renderização ---------- */

function sumBy(items, type) {
  return items.filter((i) => i.type === type).reduce((acc, i) => acc + i.cents, 0);
}

function render() {
  const monthItems = state.items.filter((i) => i.date.startsWith(state.month));
  const totalIn = sumBy(monthItems, 'entrada');
  const totalOut = sumBy(monthItems, 'saida');
  const balance = totalIn - totalOut;

  $('monthLabel').textContent = monthLabel(state.month);
  $('todayBtn').hidden = state.month === currentMonth();

  const bal = $('balanceValue');
  bal.textContent = brl.format(balance / 100);
  bal.classList.toggle('neg', balance < 0);
  $('totalIn').textContent = brl.format(totalIn / 100);
  $('totalOut').textContent = brl.format(totalOut / 100);

  const sum = totalIn + totalOut;
  $('flowIn').style.width = sum ? `${(totalIn / sum) * 100}%` : '0';
  $('flowOut').style.width = sum ? `${(totalOut / sum) * 100}%` : '0';

  renderLedger(monthItems);
  renderCategories(monthItems, totalOut);
}

function renderLedger(monthItems) {
  const list = $('ledger');
  list.replaceChildren();

  const sorted = [...monthItems].sort((a, b) =>
    a.date === b.date ? 0 : (a.date < b.date ? 1 : -1));

  $('emptyMsg').hidden = sorted.length > 0;
  $('listCount').textContent = sorted.length
    ? `${sorted.length} ${sorted.length === 1 ? 'lançamento' : 'lançamentos'}`
    : '';

  sorted.forEach((i) => {
    const li = document.createElement('li');

    const date = document.createElement('span');
    date.className = 'l-date';
    date.textContent = formatDateBR(i.date);

    const main = document.createElement('div');
    main.className = 'l-main';
    const desc = document.createElement('div');
    desc.className = 'l-desc';
    desc.textContent = i.desc;
    desc.title = i.desc;
    const cat = document.createElement('div');
    cat.className = 'l-cat';
    cat.textContent = i.category;
    main.append(desc, cat);

    const val = document.createElement('span');
    val.className = `l-val ${i.type === 'entrada' ? 'in' : 'out'}`;
    val.textContent = (i.type === 'entrada' ? '+ ' : '− ') + brl.format(i.cents / 100);

    const actions = document.createElement('div');
    actions.className = 'l-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'mini';
    edit.textContent = 'Editar';
    edit.dataset.action = 'edit';
    edit.dataset.id = i.id;
    edit.setAttribute('aria-label', `Editar ${i.desc}`);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'mini del';
    del.textContent = 'Excluir';
    del.dataset.action = 'delete';
    del.dataset.id = i.id;
    del.setAttribute('aria-label', `Excluir ${i.desc}`);
    actions.append(edit, del);

    li.append(date, main, val, actions);
    list.appendChild(li);
  });
}

function renderCategories(monthItems, totalOut) {
  const list = $('catList');
  list.replaceChildren();

  const byCat = {};
  monthItems.filter((i) => i.type === 'saida').forEach((i) => {
    byCat[i.category] = (byCat[i.category] || 0) + i.cents;
  });
  const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  $('catEmpty').hidden = rows.length > 0;

  rows.forEach(([name, cents]) => {
    const pct = totalOut ? (cents / totalOut) * 100 : 0;
    const li = document.createElement('li');

    const top = document.createElement('div');
    top.className = 'cat-top';
    const n = document.createElement('span');
    n.textContent = name;
    const v = document.createElement('span');
    v.textContent = `${brl.format(cents / 100)} · ${Math.round(pct)}%`;
    top.append(n, v);

    const bar = document.createElement('div');
    bar.className = 'cat-bar';
    const fill = document.createElement('i');
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);

    li.append(top, bar);
    list.appendChild(li);
  });
}

/* ---------- formulário ---------- */

function resetForm() {
  state.editingId = null;
  form.reset();
  fDate.value = todayISO();
  fillCategories();
  showError('');
  submitBtn.textContent = 'Adicionar lançamento';
  cancelEdit.hidden = true;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const desc = fDesc.value.trim();
  const cents = parseMoney(fValue.value);
  const date = fDate.value;

  if (!desc) { showError('Escreva uma descrição para o lançamento.'); fDesc.focus(); return; }
  if (cents === null) { showError('Informe um valor maior que zero. Ex.: 49,90'); fValue.focus(); return; }
  if (!date) { showError('Escolha a data do lançamento.'); fDate.focus(); return; }

  const item = {
    id: state.editingId || newId(),
    type: selectedType(),
    desc,
    cents,
    category: fCat.value,
    date,
  };

  if (state.editingId) {
    state.items = state.items.map((i) => (i.id === item.id ? item : i));
    toast('Lançamento atualizado');
  } else {
    state.items.push(item);
    toast('Lançamento adicionado');
  }

  state.month = date.slice(0, 7);
  save();
  resetForm();
  render();
  fDesc.focus();
});

form.addEventListener('change', (e) => {
  if (e.target.name === 'type') fillCategories();
});

cancelEdit.addEventListener('click', resetForm);

/* ---------- ações da lista ---------- */

$('ledger').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const item = state.items.find((i) => i.id === btn.dataset.id);
  if (!item) return;

  if (btn.dataset.action === 'delete') {
    if (confirm(`Excluir "${item.desc}"?`)) {
      state.items = state.items.filter((i) => i.id !== item.id);
      if (state.editingId === item.id) resetForm();
      save();
      render();
      toast('Lançamento excluído');
    }
    return;
  }

  // editar
  state.editingId = item.id;
  form.elements.type.value = item.type;
  fillCategories(item.category);
  fDesc.value = item.desc;
  fValue.value = (item.cents / 100).toFixed(2).replace('.', ',');
  fDate.value = item.date;
  showError('');
  submitBtn.textContent = 'Salvar alterações';
  cancelEdit.hidden = false;
  fDesc.focus();
  fDesc.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* ---------- navegação de mês ---------- */

$('prevMonth').addEventListener('click', () => { state.month = shiftMonth(state.month, -1); render(); });
$('nextMonth').addEventListener('click', () => { state.month = shiftMonth(state.month, 1); render(); });
$('todayBtn').addEventListener('click', () => { state.month = currentMonth(); render(); });

/* ---------- exportar / importar ---------- */

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  let s = String(value);
  // evita que o Excel interprete o texto como fórmula
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

$('exportCsv').addEventListener('click', () => {
  if (!state.items.length) { toast('Não há lançamentos para exportar.'); return; }
  const rows = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']];
  [...state.items]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .forEach((i) => {
      const [y, m, d] = i.date.split('-');
      const signed = (i.type === 'entrada' ? '' : '-') + (i.cents / 100).toFixed(2).replace('.', ',');
      rows.push([`${d}/${m}/${y}`, i.type === 'entrada' ? 'Entrada' : 'Saída', i.category, i.desc, signed]);
    });
  const csv = '\ufeff' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
  download(`caderneta-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8');
});

$('exportJson').addEventListener('click', () => {
  download(`caderneta-backup-${todayISO()}.json`, JSON.stringify(state.items, null, 2), 'application/json');
});

$('importBtn').addEventListener('click', () => $('importFile').click());

$('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('formato');
      const valid = data.filter(isValidItem);
      if (!valid.length) throw new Error('vazio');
      if (!confirm(`Restaurar ${valid.length} lançamentos? Isso substitui os dados atuais.`)) return;
      state.items = valid;
      save();
      resetForm();
      render();
      toast('Backup restaurado');
    } catch (err) {
      toast('Arquivo inválido. Use um backup gerado pela Caderneta.');
    }
  };
  reader.readAsText(file);
});

$('wipeBtn').addEventListener('click', () => {
  if (!state.items.length) { toast('Não há nada para apagar.'); return; }
  if (confirm('Apagar todos os lançamentos? Essa ação não pode ser desfeita.')) {
    state.items = [];
    save();
    resetForm();
    render();
    toast('Todos os dados foram apagados');
  }
});

/* ---------- início ---------- */

resetForm();
render();
