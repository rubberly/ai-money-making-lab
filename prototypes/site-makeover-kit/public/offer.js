// Public offer page: package list, interest form, and a TEST-MODE order flow (no payment is taken).

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { errors: data.errors || {} });
  return data;
}

function showErrors(form, errors = {}) {
  form.querySelectorAll('[data-field]').forEach(l => {
    const msg = errors[l.dataset.field];
    l.classList.toggle('invalid', Boolean(msg));
    const e = l.querySelector('.err');
    if (e) e.textContent = msg || '';
  });
}

const values = form => Object.fromEntries([...form.elements].filter(e => e.name).map(e => [e.name, e.value]));

const dialog = document.getElementById('orderDialog');
const orderForm = document.getElementById('orderForm');
let currentTier = null;

async function loadTiers() {
  const box = document.getElementById('tiers');
  try {
    const res = await fetch('/api/offer-config');
    if (!res.ok) throw new Error();
    const cfg = await res.json();
    document.getElementById('brand').textContent = cfg.businessName;
    box.replaceChildren(...cfg.tiers.map(t => h('div', { class: 'panel tier' },
      h('h3', {}, t.name),
      h('div', { class: 'price' }, `${cfg.currency}${t.price}`, ' ', h('small', {}, t.unit)),
      h('p', {}, t.description),
      h('div', { class: 'actions' },
        h('a', { class: 'btn secondary', href: '#interest' }, 'Ask about this'),
        h('button', { class: 'btn', type: 'button', onclick: () => openOrder(t, cfg.currency) }, 'Reserve (test mode)'),
      ),
    )));
  } catch {
    box.replaceChildren(h('div', { class: 'notice bad' }, 'Could not load packages. Please refresh.'));
  }
}

function openOrder(tier, currency) {
  currentTier = tier;
  orderForm.reset();
  showErrors(orderForm, {});
  document.getElementById('orderStatus').textContent = '';
  document.getElementById('orderTitle').textContent = `Reserve "${tier.name}" (${currency}${tier.price} ${tier.unit}), test mode`;
  dialog.showModal();
}

document.getElementById('closeDialog').addEventListener('click', () => dialog.close());

orderForm.addEventListener('submit', async e => {
  e.preventDefault();
  const status = document.getElementById('orderStatus');
  try {
    const order = await post('/api/test-orders', { ...values(orderForm), tierId: currentTier.id });
    showErrors(orderForm, {});
    status.className = 'small ok';
    status.textContent = `Test order recorded (${order.status}). Reference ${order.id.slice(0, 8)}.`;
  } catch (err) {
    showErrors(orderForm, err.errors);
    status.className = 'small err';
    status.textContent = err.message;
  }
});

const leadForm = document.getElementById('leadForm');
leadForm.addEventListener('submit', async e => {
  e.preventDefault();
  const status = document.getElementById('leadStatus');
  const btn = leadForm.querySelector('button[type=submit]');
  btn.disabled = true;
  status.className = 'small';
  status.textContent = 'Sending…';
  try {
    await post('/api/leads', values(leadForm));
    showErrors(leadForm, {});
    leadForm.reset();
    status.className = 'small ok';
    status.textContent = "Thanks! I'll be in touch about your free sample.";
  } catch (err) {
    showErrors(leadForm, err.errors);
    status.className = 'small err';
    status.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

loadTiers();
