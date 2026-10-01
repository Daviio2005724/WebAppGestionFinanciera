document.addEventListener('DOMContentLoaded', () => {
    const fmt = (v, d = 4) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d }).format(v);
    const cop = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);
    const pct = v => fmt(v * 100) + '%';
    const fila = (k, v) => `<li><span>${k}</span><strong>${v}</strong></li>`;
    const lista = filas => `<ul class="resultado-lista">${filas.join('')}</ul>`;
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const req = (v, ...ks) => { if (ks.some(k => isNaN(v[k]))) throw new Error('Completa los campos necesarios.'); };
    const chk = (ok, msg) => { if (!ok) throw new Error(msg); };

    // Fórmulas (material del curso)
    const fv = (R, i, n) => i === 0 ? R * n : R * (Math.pow(1 + i, n) - 1) / i;
    const pv = (R, i, n) => i === 0 ? R * n : R * (1 - Math.pow(1 + i, -n)) / i;
    const vpAr = (R, L, i, n) => i === 0 ? R * n + L * n * (n - 1) / 2
        : pv(R, i, n) + L / i * ((1 - Math.pow(1 + i, -n)) / i - n * Math.pow(1 + i, -n));
    const vpGe = (R, G, i, n) => G === i ? n * R / (1 + i)
        : R * (Math.pow(1 + G, n) * Math.pow(1 + i, -n) - 1) / (G - i);

    const gradiente = (vp, i, n, ultimo) => lista([
        fila('Valor presente (VP)', cop(vp)),
        fila('Valor futuro (VF)', cop(vp * Math.pow(1 + i, n))),
        fila(`Último pago (n = ${n})`, cop(ultimo))
    ]);

    const llenar = obj => Object.entries(obj).forEach(([k, val]) => {
        const el = document.getElementById('indicadores-' + k);
        if (el) { el.value = String(Math.round(val * 100) / 100).replace('.', ','); el.dispatchEvent(new Event('input')); }
    });
    const eti = (x, lo, hi, inv) => {
        const bajo = x < lo, alto = x > hi;
        if (!bajo && !alto) return ' <span class="positivo">dentro del rango</span>';
        return ` <span class="${bajo !== !!inv ? 'negativo' : 'positivo'}">${bajo ? 'por debajo' : 'por encima'} del rango</span>`;
    };
    const depBase = v => {
        req(v, 'c', 'vr', 'n');
        chk(v.c > 0 && v.vr >= 0 && v.vr < v.c && Number.isInteger(v.n) && v.n >= 1, 'Revisa costo, valor residual y vida útil (años enteros).');
        return [v.c, v.c - v.vr, v.n];
    };
    const depTabla = (deps, costo) => {
        let ac = 0;
        return '<div class="table-responsive"><table><thead><tr><th>Año</th><th>Depreciación</th><th>Acumulada</th><th>Valor en libros</th></tr></thead><tbody>'
            + deps.map((d, k) => { ac += d; return `<tr><td>${k + 1}</td><td>${cop(d)}</td><td>${cop(ac)}</td><td>${cop(costo - ac)}</td></tr>`; }).join('')
            + '</tbody></table></div>';
    };
    const ratio = (a, b) => (isNaN(a) || isNaN(b) || b === 0) ? null : a / b;

    // Campos de dinero (se muestran como 1.234.567 y se leen con leerNumero)
    const DINERO = {
        anualidades: ['R', 'V'], gradientes: ['R', 'L'], interes: ['P', 'S'],
        resultados: ['vb', 'dev', 'cv', 'ga', 'gv', 'ino', 'gno'],
        balance: ['efec', 'invt', 'cxc', 'invn', 'afijo', 'otros', 'pcor', 'plp'],
        depreciacion: ['c', 'vr'], provision: ['ind', 'r1', 'r2', 'r3'],
        indicadores: ['ac', 'pc', 'inv', 'ta', 'tp', 'pat', 'vn', 'ub', 'uo', 'un', 'cv', 'cxc', 'vc', 'invp', 'cxp', 'cc']
    };

    const modulos = [
        {
            id: 'tasas', titulo: 'Tasas',
            intro: 'Convierte entre tasa nominal, periódica y efectiva anual. Úsalo antes de las demás calculadoras.',
            campos: [['tasa', 'Tasa (%)', 30], ['m', 'm: períodos de capitalización por año (12 mensual, 4 trimestral)', 12], ['m2', 'm destino (para pasar de una nominal a otra)', 4]],
            acciones: [
                ['Nominal → efectiva', v => {
                    req(v, 'tasa', 'm'); chk(v.m > 0, 'm debe ser mayor a 0.');
                    const i = v.tasa / 100 / v.m;
                    return lista([fila('Tasa periódica i', pct(i)), fila('Efectiva anual', pct(Math.pow(1 + i, v.m) - 1))]);
                }],
                ['Nominal → otra nominal', v => {
                    req(v, 'tasa', 'm', 'm2'); chk(v.m > 0 && v.m2 > 0, 'm y m destino deben ser mayores a 0.');
                    const ea = Math.pow(1 + v.tasa / 100 / v.m, v.m) - 1;
                    return lista([fila('Efectiva anual', pct(ea)), fila(`Nominal equivalente (m = ${v.m2})`, pct((Math.pow(1 + ea, 1 / v.m2) - 1) * v.m2))]);
                }],
                ['Efectiva anual → nominal', v => {
                    req(v, 'tasa', 'm'); chk(v.m > 0 && v.tasa > -100, 'Revisa la tasa y m.');
                    const i = Math.pow(1 + v.tasa / 100, 1 / v.m) - 1;
                    return lista([fila('Tasa periódica i', pct(i)), fila(`Nominal convertible m = ${v.m}`, pct(i * v.m))]);
                }]
            ]
        },
        {
            id: 'anualidades', titulo: 'Anualidades',
            etiquetas: { 'R desde VP': { V: 'Valor presente (VP)' }, 'R desde VF': { V: 'Valor futuro (VF)' } },
            intro: 'Pagos iguales a intervalos iguales. La tasa debe estar en la misma periodicidad que n.',
            campos: [['R', 'Renta (R)', 2000], ['i', 'Tasa por período (%)', 2.5], ['n', 'Períodos (n)', 30], ['V', 'VP o VF conocido (para despejar R)', '']],
            acciones: [
                ['Valor final (VF)', v => { req(v, 'R', 'i', 'n'); chk(v.n > 0, 'n debe ser mayor a 0.'); return lista([fila('VF', cop(fv(v.R, v.i / 100, v.n)))]); }],
                ['Valor presente (VP)', v => { req(v, 'R', 'i', 'n'); chk(v.n > 0, 'n debe ser mayor a 0.'); return lista([fila('VP', cop(pv(v.R, v.i / 100, v.n)))]); }],
                ['R desde VP', v => { req(v, 'V', 'i', 'n'); chk(v.n > 0, 'n debe ser mayor a 0.'); const i = v.i / 100; return lista([fila('R', cop(i === 0 ? v.V / v.n : v.V * i / (1 - Math.pow(1 + i, -v.n))))]); }],
                ['R desde VF', v => { req(v, 'V', 'i', 'n'); chk(v.n > 0, 'n debe ser mayor a 0.'); const i = v.i / 100; return lista([fila('R', cop(i === 0 ? v.V / v.n : v.V * i / (Math.pow(1 + i, v.n) - 1)))]); }]
            ]
        },
        {
            id: 'gradientes', titulo: 'Gradientes',
            intro: 'Aritmético: cada pago sube R + L. Geométrico: cada pago se multiplica por (1+G).',
            campos: [['R', 'Primer pago (R)', 50], ['L', 'Gradiente aritmético (L)', 10], ['G', 'Gradiente geométrico G (%)', 5], ['i', 'Tasa por período (%)', 3], ['n', 'Períodos (n)', 20]],
            acciones: [
                ['Aritmético', v => { req(v, 'R', 'L', 'i', 'n'); chk(v.n > 0, 'n debe ser mayor a 0.'); const i = v.i / 100; return gradiente(vpAr(v.R, v.L, i, v.n), i, v.n, v.R + (v.n - 1) * v.L); }],
                ['Geométrico', v => { req(v, 'R', 'G', 'i', 'n'); chk(v.n > 0, 'n debe ser mayor a 0.'); const i = v.i / 100, G = v.G / 100; return gradiente(vpGe(v.R, G, i, v.n), i, v.n, v.R * Math.pow(1 + G, v.n - 1)); }]
            ]
        },
        {
            id: 'indicadores', titulo: 'Indicadores financieros',
            intro: 'Llena solo los datos que tengas del Balance y del Estado de Resultados; se calculan los indicadores posibles.',
            campos: [
                ['sector', 'Sector de la empresa (para evaluar márgenes)', 'Industrial', 'sel', ['Industrial', 'Comercial']],
                ['ac', 'Activo corriente', ''], ['pc', 'Pasivo corriente', ''], ['inv', 'Inventarios', ''],
                ['ta', 'Total activo', ''], ['tp', 'Total pasivo', ''], ['pat', 'Patrimonio', ''],
                ['vn', 'Ventas netas', ''], ['ub', 'Utilidad bruta', ''], ['uo', 'Utilidad operacional', ''], ['un', 'Utilidad neta', ''],
                ['cv', 'Costo de ventas', ''], ['cxc', 'Cuentas por cobrar promedio', ''], ['vc', 'Ventas a crédito', ''],
                ['invp', 'Inventario promedio', ''], ['cxp', 'Cuentas por pagar promedio', ''], ['cc', 'Compras a crédito', '']
            ],
            acciones: [['Calcular indicadores', v => {
                const out = [], com = v.sector === 'Comercial';
                const add = (k, val, f) => { if (val !== null) out.push(fila(k, f(val))); };
                add('Razón corriente', ratio(v.ac, v.pc), x => fmt(x, 2) + ' (aceptable desde 1,3)');
                add('Prueba ácida', ratio(v.ac - v.inv, v.pc), x => fmt(x, 2));
                if (!isNaN(v.ac) && !isNaN(v.pc)) out.push(fila('Capital neto de trabajo', cop(v.ac - v.pc)));
                add('Rotación de cartera', ratio(v.cxc * 365, v.vc), x => fmt(x, 1) + ' días');
                add('Rotación de inventarios', ratio(v.invp * 365, v.cv), x => fmt(x, 1) + ' días');
                add('Rotación de proveedores', ratio(v.cxp * 365, v.cc), x => fmt(x, 1) + ' días');
                add('Margen bruto', ratio(v.ub, v.vn), x => pct(x) + (com ? eti(x, .20, .30) : eti(x, .30, .40)));
                add('Margen operacional', ratio(v.uo, v.vn), x => pct(x) + (com ? eti(x, .05, .10) : eti(x, .10, .20)));
                add('Margen neto', ratio(v.un, v.vn), x => pct(x) + (com ? eti(x, .02, .03) : eti(x, .05, .10)));
                add('Rendimiento del patrimonio (ROE)', ratio(v.un, v.pat), pct);
                add('Rendimiento del activo (ROA)', ratio(v.un, v.ta), pct);
                add('Nivel de endeudamiento', ratio(v.tp, v.ta), x => pct(x) + eti(x, .50, .70, true) + ' (óptimo en crecimiento: 50% a 70%)');
                add('Concentración de pasivos a corto plazo', ratio(v.pc, v.tp), pct);
                chk(out.length, 'Ingresa al menos un par de datos (por ejemplo activo y pasivo corriente).');
                return lista(out);
            }]]
        },
        {
            id: 'presupuesto', titulo: 'Presupuesto',
            intro: 'Proyecta cada rubro año a año con el incremento por IPC. Un rubro por línea, con el formato Nombre: valor.',
            campos: [['rubros', 'Rubros (valor del año 1)', 'Infraestructura y procesamiento: 20.000.000\nSistemas operativos y software: 12.000.000\nServicios y mantenimiento: 15.000.000\nProyectos y gobierno de TI: 18.000.000', 'area'], ['ipc', 'Incremento anual IPC (%)', 5], ['anios', 'Años a proyectar', 3]],
            acciones: [['Proyectar', v => {
                req(v, 'ipc', 'anios'); chk(v.anios >= 1 && v.anios <= 15, 'Años debe estar entre 1 y 15.');
                const rubros = v.rubros.split('\n').map(l => {
                    const k = l.lastIndexOf(':');
                    return k < 0 ? null : [l.slice(0, k).trim(), parseFloat(l.slice(k + 1).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))];
                }).filter(r => r && r[0] && !isNaN(r[1]));
                chk(rubros.length, 'Escribe al menos un rubro con el formato Nombre: valor.');
                const f = 1 + v.ipc / 100, cols = Array.from({ length: v.anios }, (_, k) => k);
                const totales = cols.map(k => rubros.reduce((a, r) => a + r[1] * Math.pow(f, k), 0));
                return `<div class="table-responsive"><table><thead><tr><th>Rubro</th>${cols.map(k => `<th>Año ${k + 1}</th>`).join('')}</tr></thead><tbody>`
                    + rubros.map(r => `<tr><td>${esc(r[0])}</td>${cols.map(k => `<td>${cop(r[1] * Math.pow(f, k))}</td>`).join('')}</tr>`).join('')
                    + `<tr><th>Total</th>${totales.map(t => `<th>${cop(t)}</th>`).join('')}</tr></tbody></table></div>`;
            }]]
        },
        {
            id: 'interes', titulo: 'Interés (despejes)', prefijo: true,
            intro: 'Interés simple y compuesto: calcula P, S, I, i, t o n según los datos que tengas.',
            campos: [['P', 'Capital (P)', ''], ['S', 'Monto (S)', ''], ['i', 'Tasa por período (%)', ''], ['n', 'Tiempo o períodos (t o n)', '']],
            acciones: [
                ['Simple: S e I', v => { req(v, 'P', 'i', 'n'); const I = v.P * v.i / 100 * v.n; return lista([fila('Interés (I)', cop(I)), fila('Monto (S)', cop(v.P + I))]); }],
                ['Simple: P', v => { req(v, 'S', 'i', 'n'); return lista([fila('P', cop(v.S / (1 + v.i / 100 * v.n)))]); }],
                ['Simple: tasa i', v => { req(v, 'P', 'S', 'n'); chk(v.P > 0 && v.n > 0, 'P y t deben ser mayores a 0.'); return lista([fila('i', pct((v.S / v.P - 1) / v.n))]); }],
                ['Simple: tiempo t', v => { req(v, 'P', 'S', 'i'); chk(v.P > 0 && v.i > 0, 'P e i deben ser mayores a 0.'); return lista([fila('t', fmt((v.S / v.P - 1) / (v.i / 100)))]); }],
                ['Compuesto: S', v => { req(v, 'P', 'i', 'n'); return lista([fila('S', cop(v.P * Math.pow(1 + v.i / 100, v.n)))]); }],
                ['Compuesto: P', v => { req(v, 'S', 'i', 'n'); return lista([fila('P', cop(v.S * Math.pow(1 + v.i / 100, -v.n)))]); }],
                ['Compuesto: n', v => { req(v, 'P', 'S', 'i'); chk(v.P > 0 && v.S > 0 && v.i > 0, 'P, S e i deben ser mayores a 0.'); return lista([fila('n', fmt(Math.log(v.S / v.P) / Math.log(1 + v.i / 100)))]); }],
                ['Compuesto: tasa i', v => { req(v, 'P', 'S', 'n'); chk(v.P > 0 && v.S > 0 && v.n > 0, 'P, S y n deben ser mayores a 0.'); return lista([fila('i', pct(Math.pow(v.S / v.P, 1 / v.n) - 1))]); }]
            ]
        },
        {
            id: 'resultados', titulo: 'Estado de Resultados',
            intro: 'Calcula la utilidad neta paso a paso y envía los datos al módulo de Indicadores financieros.',
            campos: [['vb', 'Ventas / ingresos brutos', ''], ['dev', 'Devoluciones, rebajas y descuentos', 0], ['cv', 'Costo de ventas', ''], ['ga', 'Gastos de administración', 0], ['gv', 'Gastos de ventas', 0], ['ino', 'Ingresos no operacionales', 0], ['gno', 'Gastos no operacionales (financieros)', 0], ['imp', 'Provisión impuesto de renta (%)', 35]],
            acciones: [['Calcular y enviar a Indicadores', v => {
                req(v, 'vb', 'cv', 'dev', 'ga', 'gv', 'ino', 'gno', 'imp');
                const vn = v.vb - v.dev, ub = vn - v.cv, uo = ub - v.ga - v.gv, uai = uo + v.ino - v.gno;
                const imp = Math.max(0, uai) * v.imp / 100, un = uai - imp;
                llenar({ vn, ub, uo, un, cv: v.cv });
                return lista([fila('Ventas netas', cop(vn)), fila('Utilidad bruta', cop(ub)), fila('Utilidad operacional', cop(uo)),
                    fila('Utilidad antes de impuestos', cop(uai)), fila('Impuesto de renta', cop(imp)), fila('Utilidad neta', cop(un))])
                    + '<p><em>Datos enviados a Indicadores financieros.</em></p>';
            }]]
        },
        {
            id: 'balance', titulo: 'Balance General',
            intro: 'Patrimonio = Activos − Pasivos. Los totales se envían al módulo de Indicadores financieros.',
            campos: [['efec', 'Efectivo', 0], ['invt', 'Inversiones temporales', 0], ['cxc', 'Cuentas por cobrar', 0], ['invn', 'Inventarios', 0], ['afijo', 'Activo fijo', 0], ['otros', 'Otros activos / diferidos', 0], ['pcor', 'Pasivo corriente', 0], ['plp', 'Pasivo a largo plazo', 0]],
            acciones: [['Calcular y enviar a Indicadores', v => {
                req(v, 'efec', 'invt', 'cxc', 'invn', 'afijo', 'otros', 'pcor', 'plp');
                const ac = v.efec + v.invt + v.cxc + v.invn, ta = ac + v.afijo + v.otros, tp = v.pcor + v.plp, pat = ta - tp;
                llenar({ ac, pc: v.pcor, inv: v.invn, ta, tp, pat });
                return lista([fila('Activo corriente', cop(ac)), fila('Total activo', cop(ta)), fila('Pasivo corriente', cop(v.pcor)),
                    fila('Total pasivo', cop(tp)), fila('Patrimonio', cop(pat))]) + '<p><em>Datos enviados a Indicadores financieros.</em></p>';
            }]]
        },
        {
            id: 'depreciacion', titulo: 'Depreciación', compartido: true,
            intro: 'Tabla año a año por método. Las unidades por año solo se usan en el método de unidades de producción.',
            campos: [['c', 'Costo del activo', ''], ['vr', 'Valor residual', 0], ['n', 'Vida útil (años)', ''], ['u', 'Unidades producidas por año (separadas por coma)', '', 'area']],
            acciones: [
                ['Línea recta', v => { const [c, b, n] = depBase(v); return depTabla(Array(n).fill(b / n), c); }],
                ['Suma de dígitos', v => { const [c, b, n] = depBase(v); const s = n * (n + 1) / 2; return depTabla(Array.from({ length: n }, (_, k) => b * (n - k) / s), c); }],
                ['Unidades de producción', v => {
                    const [c, b] = depBase(v);
                    const u = v.u.split(',').map(x => parseFloat(x.replace(/\./g, ''))).filter(x => !isNaN(x)), t = u.reduce((a, x) => a + x, 0);
                    chk(u.length && t > 0, 'Escribe las unidades por año separadas por coma.');
                    return depTabla(u.map(x => b * x / t), c);
                }],
                ['Reducción de saldos', v => {
                    const [c, , n] = depBase(v); chk(v.vr > 0, 'Este método requiere un valor residual mayor a 0.');
                    const r = 1 - Math.pow(v.vr / c, 1 / n); let libro = c;
                    return lista([fila('Tasa de depreciación', pct(r))]) + depTabla(Array.from({ length: n }, () => { const d = libro * r; libro -= d; return d; }), c);
                }]
            ]
        },
        {
            id: 'provision', titulo: 'Provisión de cartera',
            usa: { 'General por rangos': ['r1', 'r2', 'r3'] },
            intro: 'Individual: 33% anual en facturas con más de 1 año. General: 5% (3 a 6 meses), 10% (6 a 12) y 15% (más de 12).',
            campos: [['ind', 'Facturas individuales con más de 1 año', ''], ['r1', 'Cartera de 3 a 6 meses', ''], ['r2', 'Cartera de 6 a 12 meses', ''], ['r3', 'Cartera de más de 12 meses', '']],
            acciones: [
                ['Individual (33%)', v => { req(v, 'ind'); return lista([fila('Provisión', cop(v.ind * 0.33))]); }],
                ['General por rangos', v => {
                    const z = x => isNaN(x) ? 0 : x, a = z(v.r1) * 0.05, b = z(v.r2) * 0.10, c = z(v.r3) * 0.15;
                    chk(a + b + c > 0, 'Ingresa al menos un rango de cartera.');
                    return lista([fila('3 a 6 meses (5%)', cop(a)), fila('6 a 12 meses (10%)', cop(b)), fila('Más de 12 meses (15%)', cop(c)), fila('Provisión total', cop(a + b + c))]);
                }]
            ]
        }
    ];

    // --- Render dinámico: cada cálculo con sus propios campos y su propio resultado ---
    const menu = document.querySelector('.menu-list');
    const area = document.querySelector('.content-area');
    const activar = (li, sec) => {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active'));
        li.classList.add('active');
        sec.classList.add('active');
    };
    const usaDe = fn => {
        const mt = fn.toString().match(/req\(v,([^)]*)\)/);
        return mt ? [...mt[1].matchAll(/'(\w+)'/g)].map(x => x[1]) : null;
    };
    const campoHTML = (pref, [id, label, def, tipo, opts]) => `<div class="form-group"><label for="${pref}-${id}">${label}</label>`
        + (tipo === 'sel' ? `<select id="${pref}-${id}">${opts.map(o => `<option>${o}</option>`).join('')}</select>`
            : tipo === 'area' ? `<textarea id="${pref}-${id}" rows="5">${def}</textarea>`
                : `<input type="number" step="any" id="${pref}-${id}" value="${def}">`) + '</div>';
    const leer = (pref, campos, dinero) => {
        const v = {};
        campos.forEach(([id, , , tipo]) => {
            const el = document.getElementById(`${pref}-${id}`);
            v[id] = (tipo === 'area' || tipo === 'sel') ? el.value : dinero.includes(id) ? leerNumero(el) : parseFloat(el.value);
        });
        return v;
    };
    const GRUPOS_INTERES = { Simple: 'Interés simple', Compuesto: 'Interés compuesto' };

    modulos.forEach(m => {
        const dinero = DINERO[m.id] || [];
        const li = document.createElement('li');
        li.className = 'menu-item';
        li.textContent = m.titulo;
        li.tabIndex = 0;
        li.setAttribute('data-target', m.id);

        const sec = document.createElement('section');
        sec.className = 'module-section';
        sec.id = m.id;
        sec.innerHTML = `<div class="module-card"><h2>${m.titulo}</h2><p><em>${m.intro}</em></p><div class="apartados"></div></div>`;
        const cont = sec.querySelector('.apartados');

        // Crea un apartado con sus campos, botones y caja de resultado
        const apartado = (pref, titulo, campos, acciones, unico) => {
            const box = document.createElement('div');
            box.className = 'apartado' + (unico ? ' apartado-unico' : '');
            box.innerHTML = (titulo ? `<h3>${titulo}</h3>` : '') + `<form><div class="campos-grid">${campos.map(c => campoHTML(pref, c)).join('')}</div>
                <div class="button-group"></div><div class="resultado-box" aria-live="polite"></div></form>`;
            box.querySelector('form').addEventListener('submit', e => e.preventDefault());
            campos.forEach(([id]) => { if (dinero.includes(id)) activarCOP(box.querySelector(`#${pref}-${id}`)); });
            const salida = box.querySelector('.resultado-box');
            acciones.forEach(([texto, fn]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn-primary';
                b.textContent = texto;
                b.addEventListener('click', () => {
                    try { salida.innerHTML = fn(leer(pref, campos, dinero)); }
                    catch (err) { salida.innerHTML = `<p class="negativo">${err.message}</p>`; }
                });
                box.querySelector('.button-group').appendChild(b);
            });
            cont.appendChild(box);
        };

        if (m.acciones.length === 1 || m.compartido) {
            apartado(m.id, '', m.campos, m.acciones, true);
        } else {
            let grupoActual = '';
            m.acciones.forEach((a, ai) => {
                let titulo = a[0];
                if (m.prefijo) {
                    const [pre, resto] = titulo.split(': ');
                    if (GRUPOS_INTERES[pre] !== grupoActual) {
                        grupoActual = GRUPOS_INTERES[pre];
                        cont.insertAdjacentHTML('beforeend', `<h3 class="grupo">${grupoActual}</h3>`);
                    }
                    titulo = 'Calcular ' + resto;
                }
                const usa = (m.usa && m.usa[a[0]]) || usaDe(a[1]) || m.campos.map(c => c[0]);
                const etiquetas = (m.etiquetas && m.etiquetas[a[0]]) || {};
                const campos = m.campos.filter(c => usa.includes(c[0])).map(c => etiquetas[c[0]] ? [c[0], etiquetas[c[0]], ...c.slice(2)] : c);
                apartado(`${m.id}-${ai}`, titulo, campos, [['Calcular', a[1]]], false);
            });
        }

        li.addEventListener('click', () => activar(li, sec));
        li.addEventListener('keydown', e => { if (e.key === 'Enter') activar(li, sec); });
        menu.appendChild(li);
        area.appendChild(sec);
    });

    // --- Menú ordenado por grupos ---
    const grupos = [
        ['Dinero en el tiempo', ['matematicas-financieras', 'interes', 'tasas', 'anualidades', 'gradientes']],
        ['Proyectos', ['flujo-caja', 'evaluacion-proyectos', 'presupuesto']],
        ['Estados e indicadores', ['resultados', 'balance', 'indicadores', 'depreciacion', 'provision']]
    ];
    const items = {};
    document.querySelectorAll('.menu-item').forEach(li => { items[li.getAttribute('data-target')] = li; });
    menu.innerHTML = '';
    grupos.forEach(([nombre, ids]) => {
        const h = document.createElement('li');
        h.className = 'menu-group';
        h.textContent = nombre;
        menu.appendChild(h);
        ids.forEach(id => items[id] && menu.appendChild(items[id]));
    });
});