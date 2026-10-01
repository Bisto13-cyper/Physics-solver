"use strict";
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty = s => esc(s).replace(/e([+-]?)0*(\d+)/g,
    (_, sg, d) => `×10<sup>${sg === '-' ? '−' : ''}${d}</sup>`);


  const I18N = {
    ar: {
      title: "Physics Solver",
      subtitle: "اكتب اللي تعرفه، والباقي يتحسب.",
      example: "مثال",
      clear: "مسح الكل",
      modeTarget: "متغير محدد",
      modeAll: "حساب عام",
      pickLabel: "عايز تحسب إيه؟",
      inputsLabel: "المعطيات",
      inputsHint: "سيب اللي مش معروف فاضي",
      note: "ملاحظة: I هو شدة التيار (A أمبير)، أما A فهو مساحة المقطع (m²).",
      insufficient: "بيانات غير كافية",
      conflictTitle: "تعارض في المدخلات",
      solutionSteps: "طريقة الحل",
      closestEq: "أقرب معادلات — لسه ناقص:",
      results: "النتائج",
      emptyTargetPrefix: "اكتب المعطيات وهيظهر",
      emptyTargetSuffix: "هنا.",
      emptyAll: "اكتب القيم اللي تعرفها، وكل اللي ينفع يتحسب هيظهر هنا.",
      backendError: "خطأ في الاتصال بالخادم!",
      invalidInput: "المدخلات غير صالحة.",
      but: "لكن",
      groupNames: {
        electric: "الكهرباء",
        material: "المادة والأبعاد",
        motion: "الحركة الدورية"
      },
      varNames: {
        Q: "الشحنة", N: "عدد الإلكترونات", I: "شدة التيار", V: "فرق الجهد",
        R: "المقاومة", Pw: "القدرة", W: "الشغل / الطاقة", t: "الزمن",
        rho_e: "المقاومة النوعية", sigma: "التوصيلية الكهربية", L: "الطول",
        A: "مساحة المقطع", r: "نصف القطر", Vol: "الحجم", m: "الكتلة",
        rho: "الكثافة", f: "التردد", T: "الزمن الدوري", v_vel: "السرعة"
      }
    },
    en: {
      title: "Physics Solver",
      subtitle: "Enter what you know, the rest is calculated.",
      example: "Example",
      clear: "Clear All",
      modeTarget: "Target Variable",
      modeAll: "Solve All",
      pickLabel: "What do you want to find?",
      inputsLabel: "Inputs",
      inputsHint: "leave unknown fields empty",
      note: "Note: I is current (A), while A is cross-sectional area (m²).",
      insufficient: "Insufficient data",
      conflictTitle: "Input conflict",
      solutionSteps: "Solution steps",
      closestEq: "Closest equations — still missing:",
      results: "Results",
      emptyTargetPrefix: "Enter inputs and",
      emptyTargetSuffix: "will appear here.",
      emptyAll: "Enter the values you know, and all calculable results will appear here.",
      backendError: "Backend connection error!",
      invalidInput: "Invalid inputs.",
      but: "but",
      groupNames: {
        electric: "Electricity",
        material: "Material & Dimensions",
        motion: "Periodic Motion"
      },
      varNames: {
        Q: "Charge", N: "Electron count", I: "Current", V: "Voltage",
        R: "Resistance", Pw: "Power", W: "Work / Energy", t: "Time",
        rho_e: "Resistivity", sigma: "Conductivity", L: "Length",
        A: "Cross-sectional area", r: "Radius", Vol: "Volume", m: "Mass",
        rho: "Density", f: "Frequency", T: "Period", v_vel: "Velocity"
      }
    },
    de: {
      title: "Physics Solver",
      subtitle: "Geben Sie ein, was Sie wissen — der Rest wird berechnet.",
      example: "Beispiel",
      clear: "Alles löschen",
      modeTarget: "Zielvariable",
      modeAll: "Alles berechnen",
      pickLabel: "Was möchten Sie berechnen?",
      inputsLabel: "Eingaben",
      inputsHint: "Unbekannte Felder leer lassen",
      note: "Hinweis: I ist die Stromstärke (A), A ist die Querschnittsfläche (m²).",
      insufficient: "Unzureichende Daten",
      conflictTitle: "Eingabekonflikt",
      solutionSteps: "Lösungsschritte",
      closestEq: "Nächste Gleichungen — fehlt noch:",
      results: "Ergebnisse",
      emptyTargetPrefix: "Geben Sie Werte ein und",
      emptyTargetSuffix: "erscheint hier.",
      emptyAll: "Geben Sie bekannte Werte ein — alle berechenbaren Ergebnisse erscheinen hier.",
      backendError: "Backend-Verbindungsfehler!",
      invalidInput: "Ungültige Eingaben.",
      but: "aber",
      groupNames: {
        electric: "Elektrizität",
        material: "Material & Abmessungen",
        motion: "Periodische Bewegung"
      },
      varNames: {
        Q: "Ladung", N: "Elektronenanzahl", I: "Stromstärke", V: "Spannung",
        R: "Widerstand", Pw: "Leistung", W: "Arbeit / Energie", t: "Zeit",
        rho_e: "Spezifischer Widerstand", sigma: "Leitfähigkeit", L: "Länge",
        A: "Querschnittsfläche", r: "Radius", Vol: "Volumen", m: "Masse",
        rho: "Dichte", f: "Frequenz", T: "Periodendauer", v_vel: "Geschwindigkeit"
      }
    }
  };

  const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

  /* ── State ── */
  const state = {
    lang: 'ar',
    meta: null,
    byKey: {},
    mode: 'target',
    target: 'Pw',
    open: new Set()
  };

  function t(key) {
    return I18N[state.lang][key] ?? I18N.en[key] ?? key;
  }
  function varName(key) {
    return I18N[state.lang].varNames[key] ?? key;
  }
  function groupName(id) {
    return I18N[state.lang].groupNames[id] ?? id;
  }

  const fields = {};
  const layoutEl = $('#layout'), pickerEl = $('#picker'),
        resultEl = $('#result'),  inputsEl = $('#inputs');

  function symHTML(key, tone = '', size = '') {
    const v = state.byKey[key];
    const cls = ['sym', tone, size, v.symbol.length > 2 ? 'long' : ''].filter(Boolean).join(' ');
    return `<span class="${cls}">${esc(v.symbol)}</span>`;
  }

  function normalize(raw) {
    return raw.trim()
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/[٫,،]/g, '.')
      .replace(/[٬\s]/g, '')
      .replace(/[−–]/g, '-');
  }
  function parse(raw) {
    const s = normalize(raw);
    if (s === '') return { empty: true };
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return { bad: true };
    const v = Number(s);
    return Number.isFinite(v) ? { value: v } : { bad: true };
  }

  function buildPicker() {
    pickerEl.innerHTML = `<h2 class="lbl">${esc(t('pickLabel'))}</h2><div class="pick-grid"></div>`;
    const grid = $('.pick-grid', pickerEl);
    for (const v of state.meta.variables) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pick'; b.dataset.key = v.key;
      b.innerHTML = `<span class="s${v.symbol.length > 2 ? ' long' : ''}">${esc(v.symbol)}</span>` +
                    `<span class="n">${esc(varName(v.key))}</span>`;
      b.addEventListener('click', () => { state.target = v.key; syncMode(); run(); });
      grid.appendChild(b);
    }
  }

  function buildInputs() {
    inputsEl.innerHTML = `<h2 class="lbl">${esc(t('inputsLabel'))}` +
      `<span class="hint">${esc(t('inputsHint'))}</span></h2>`;
    for (const g of state.meta.groups) {
      const sec = document.createElement('section');
      sec.className = 'group';
      sec.innerHTML = `<h3 class="gt">${esc(groupName(g.id))}</h3><div class="fields"></div>`;
      const wrap = $('.fields', sec);
      for (const v of state.meta.variables.filter(x => x.group === g.id)) {
        const el = document.createElement('label');
        el.className = 'field';
        el.innerHTML =
          symHTML(v.key) +
          `<span class="mid"><span class="nm">${esc(varName(v.key))}</span>` +
          `<input type="text" dir="ltr" inputmode="text" autocomplete="off" autocapitalize="off" ` +
          `spellcheck="false" placeholder="—" aria-label="${esc(varName(v.key))} (${esc(v.symbol)})"></span>` +
          `<span class="un">${esc(v.unit)}</span>`;
        const input = $('input', el);
        input.addEventListener('input', () => { paintField(v.key, false); schedule(); });
        input.addEventListener('blur',  () => paintField(v.key, true));
        fields[v.key] = { el, input };
        wrap.appendChild(el);
      }
      inputsEl.appendChild(sec);
    }
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = t('note');
    inputsEl.appendChild(note);
  }

  function paintField(key, showBad) {
    const { el, input } = fields[key];
    const p = parse(input.value);
    el.classList.toggle('filled', p.value !== undefined);
    el.classList.toggle('bad', !!p.bad && showBad);
  }

  function syncMode() {
    const isTarget = state.mode === 'target';
    layoutEl.classList.toggle('mode-all', !isTarget);
    pickerEl.hidden = !isTarget;
    document.querySelectorAll('.seg button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    document.querySelectorAll('.pick').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.key === state.target)));
    for (const [key, f] of Object.entries(fields)) f.el.hidden = isTarget && key === state.target;
  }

  function collect() {
    const values = {};
    for (const [key, { input }] of Object.entries(fields)) {
      if (state.mode === 'target' && key === state.target) continue;
      const p = parse(input.value);
      if (p.value !== undefined) values[key] = p.value;
    }
    return values;
  }

  let timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 220); }

  function run() {
    clearTimeout(timer);
    const values = collect();
    if (!Object.keys(values).length) { renderEmpty(); return; }
    const isTarget = state.mode === 'target';
    try {
      const data = isTarget
        ? handleCalculate(state.target, values)
        : handleSolve(values);
      isTarget ? renderTarget(data) : renderAll(data);
    } catch (err) {
      renderError(err.message || t('invalidInput'));
    }
  }

  function stepsHTML(steps) {
    if (!steps || !steps.length) return '';
    return `<h3 class="sub">${esc(t('solutionSteps'))}</h3><ul class="steps">` + steps.map(s =>
      `<li><div class="f">${pretty(s.formula)}</div>` +
      `<div class="v">${pretty(s.substituted)} = <b>${pretty(s.display)} ${esc(s.unit)}</b></div></li>`
    ).join('') + '</ul>';
  }

  function conflictsHTML(list) {
    if (!list || !list.length) return '';
    return `<div class="warn"><strong>${esc(t('conflictTitle'))}</strong><ul>` + list.map(c =>
      `<li>${esc(c.symbol)} = <bdi dir="ltr"><b>${pretty(c.stored)} ${esc(c.unit)}</b></bdi> — ${esc(t('but'))} ` +
      `<bdi dir="ltr">${pretty(c.formula)} = <b>${pretty(c.expected)} ${esc(c.unit)}</b></bdi></li>`
    ).join('') + '</ul></div>';
  }

  function renderEmpty() {
    if (state.mode === 'target') {
      resultEl.innerHTML = `<div class="card empty">${symHTML(state.target, 's', 'big')}` +
        `<p>${esc(t('emptyTargetPrefix'))} ${esc(varName(state.target))} ${esc(t('emptyTargetSuffix'))}</p></div>`;
    } else {
      resultEl.innerHTML = `<div class="card empty"><p>${esc(t('emptyAll'))}</p></div>`;
    }
  }

  function renderError(msg) {
    resultEl.innerHTML = `<div class="card bad"><p>${esc(msg)}</p></div>`;
  }

  function renderTarget(d) {
    if (!d.ok) {
      const hints = (d.hints || []).length
        ? `<h3 class="sub">${esc(t('closestEq'))}</h3><ul class="hints">` + d.hints.map(h =>
            `<li><bdi class="f" dir="ltr">${pretty(h.formula)}</bdi>` +
            `<span class="miss">${h.missing.map(k => symHTML(k, 'a', 'sm')).join('')}</span></li>`
          ).join('') + '</ul>'
        : '';
      resultEl.innerHTML = `<div class="card bad"><div class="res-head">${symHTML(d.target, 'a', 'big')}` +
        `<div><div class="res-name">${esc(varName(d.target))}</div>` +
        `<div class="insuff">${esc(t('insufficient'))}</div></div></div>` +
        hints + conflictsHTML(d.conflicts) + '</div>';
      return;
    }
    resultEl.innerHTML = `<div class="card ok"><div class="res-head">${symHTML(d.target, 's', 'big')}` +
      `<div><div class="res-name">${esc(varName(d.target))}</div>` +
      `<div class="res-val"><span class="num">${pretty(d.display)}</span><span class="unit">${esc(d.unit)}</span></div></div></div>` +
      stepsHTML(d.steps) + conflictsHTML(d.conflicts) + '</div>';
  }

  function renderAll(d) {
    if (!d.ok) {
      resultEl.innerHTML = `<div class="card bad"><div class="insuff">${esc(t('insufficient'))}</div>` +
        conflictsHTML(d.conflicts) + '</div>';
      return;
    }
    const tiles = d.derived.map(x =>
      `<details class="rtile" data-key="${esc(x.key)}"${state.open.has(x.key) ? ' open' : ''}>` +
      `<summary>${symHTML(x.key, 's', 'sm')}<span class="rn">${esc(varName(x.key))}</span>` +
      `<span class="rv"><span>${pretty(x.display)}</span> <span class="unit">${esc(x.unit)}</span></span></summary>` +
      stepsHTML(x.steps) + '</details>').join('');
    resultEl.innerHTML = `<div class="card ok"><div class="all-head"><h2>${esc(t('results'))}</h2>` +
      `<span class="chip">${d.derived.length}</span></div><div class="rlist">${tiles}</div>` +
      conflictsHTML(d.conflicts) + '</div>';
  }

  /* ── Language switching ── */
  function applyLang(lang) {
    state.lang = lang;
    const html = document.documentElement;
    html.lang = lang;
    html.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });

    if (state.meta) {
      buildPicker();
      buildInputs();
      syncMode();
      run();
    }
  }

  /* ── Events ── */
  resultEl.addEventListener('toggle', e => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    e.target.open ? state.open.add(k) : state.open.delete(k);
  }, true);

  document.querySelectorAll('.seg button').forEach(b =>
    b.addEventListener('click', () => { state.mode = b.dataset.mode; syncMode(); run(); }));

  function setAll(map) {
    for (const [key, f] of Object.entries(fields)) {
      f.input.value = map[key] ?? '';
      paintField(key, false);
    }
    run();
  }
  $('#btn-clear').addEventListener('click', () => setAll({}));
  $('#btn-example').addEventListener('click', () => setAll({ V: '10', R: '5', t: '3' }));

  $('#lang-select').addEventListener('change', e => applyLang(e.target.value));

  /* ── Init ── */
  state.meta = getMeta();
  state.meta.variables.forEach(v => { state.byKey[v.key] = v; });
  applyLang('ar');
  buildPicker(); buildInputs(); syncMode(); renderEmpty();
  const sel = $('.pick[aria-pressed="true"]');
  if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
})();