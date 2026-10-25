const $ = (s) => document.querySelector(s);
const money = (n) => `$${Number(n).toLocaleString()}`;
document.getElementById('yr').textContent = new Date().getFullYear();

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

fetch('/api/public/offer').then((r) => r.json()).then((o) => {
  $('[data-price="pilot"]').textContent = money(o.pilotPrice);
  $('[data-price="monthly"]').innerHTML = `${money(o.monthlyPrice)}<span class="small muted">/mo</span>`;
  $('[data-eps]').textContent = o.episodesPerMonth;
  $('#biz').textContent = o.businessName;
}).catch(() => {});

const form = $('#leadForm');
const msg = $('#formMsg');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  if (!form.name.value.trim()) return showErr('Please enter your name.', form.name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim())) return showErr('Please enter a valid email.', form.email);
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await post('/api/public/leads', Object.fromEntries(new FormData(form)));
    form.reset();
    msg.innerHTML = '<div class="notice info">Thanks! I\'ll reply within one working day.</div>';
  } catch (err) {
    showErr(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send request';
  }
});

function showErr(text, field) {
  msg.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'notice';
  d.textContent = text;
  msg.appendChild(d);
  field?.focus();
}

document.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', async () => {
  const email = form.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    location.hash = '#start';
    return showErr('Enter your email in the form below first, then click Reserve again.', form.email);
  }
  b.disabled = true;
  try {
    const r = await post('/api/public/test-checkout', { plan: b.dataset.plan, email });
    $('#testNote').textContent = r.message;
  } catch (err) {
    $('#testNote').textContent = err.message;
  } finally {
    b.disabled = false;
  }
}));
