// Formato COP en campos de dinero: 1.234.567,89 (puntos de miles y coma decimal)
window.leerNumero = el => {
    const t = String(el.value).replace(/\./g, '').replace(',', '.').trim();
    return t === '' ? NaN : parseFloat(t);
};
window.activarCOP = el => {
    if (!el) return;
    el.type = 'text';
    el.inputMode = 'decimal';
    const formatear = () => {
        let t = el.value.replace(/[^\d,-]/g, '');
        const neg = t.startsWith('-');
        const [ent, ...dec] = t.replace(/-/g, '').split(',');
        el.value = (neg ? '-' : '') + ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec.length ? ',' + dec.join('').slice(0, 2) : '');
    };
    el.addEventListener('input', formatear);
    formatear();
};

document.addEventListener('DOMContentLoaded', () => {

    ['capital-inicial', 'flujo-ingresos', 'flujo-egresos', 'saldo-inicial'].forEach(id => activarCOP(document.getElementById(id)));

    // --- 1. CONFIGURACIONES GENERALES ---
    const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const CLAVE_STORAGE = 'flujosCaja';
    let flujosEstructurados = cargarFlujos();

    function cargarFlujos() {
        try {
            const datos = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
            return Array.isArray(datos) ? datos : [];
        } catch {
            return [];
        }
    }

    function guardarFlujos() {
        try {
            localStorage.setItem(CLAVE_STORAGE, JSON.stringify(flujosEstructurados));
        } catch { /* almacenamiento no disponible */ }
    }

    const marcarResultado = (el, valor) => {
        el.classList.toggle('positivo', valor >= 0);
        el.classList.toggle('negativo', valor < 0);
    };

    // --- 2. NAVEGACIÓN Y TEMA ---
    const htmlElement = document.documentElement;
    const btnTema = document.getElementById('theme-toggle');

    btnTema.addEventListener('click', () => {
        const isLight = htmlElement.getAttribute('data-theme') === 'light';
        htmlElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
        btnTema.textContent = isLight ? '☀️ Claro' : '🌙 Oscuro';
    });

    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.getAttribute('data-target')).classList.add('active');
        });
    });

    // Evita que Enter recargue la página en formularios sin botón submit
    document.getElementById('form-interes').addEventListener('submit', e => e.preventDefault());
    document.getElementById('form-evaluacion').addEventListener('submit', e => e.preventDefault());

    // Formateo dinámico del capital inicial
    document.getElementById('capital-inicial').addEventListener('input', (e) => {
        const val = leerNumero(e.target);
        document.getElementById('display-capital').textContent = isNaN(val) ? '' : formatoCOP.format(val);
    });

    // --- 3. MATEMÁTICAS FINANCIERAS ---
    const calcularInteres = (tipo) => {
        const P = leerNumero(document.getElementById('capital-inicial'));
        const i = parseFloat(document.getElementById('tasa-interes').value) / 100;
        const n = parseFloat(document.getElementById('periodos').value);

        if (isNaN(P) || isNaN(i) || isNaN(n)) return alert('Completa todos los campos.');
        if (P < 0) return alert('El capital inicial no puede ser negativo.');
        if (n < 0) return alert('Los períodos no pueden ser negativos.');
        if (i <= -1) return alert('La tasa de interés debe ser mayor a -100%.');

        const S = tipo === 'simple' ? P * (1 + i * n) : P * Math.pow(1 + i, n);
        document.getElementById('resultado-valor-futuro').textContent = formatoCOP.format(S);
    };

    document.getElementById('btn-interes-simple').addEventListener('click', () => calcularInteres('simple'));
    document.getElementById('btn-interes-compuesto').addEventListener('click', () => calcularInteres('compuesto'));

    // --- 4. CRUD DE FLUJO DE CAJA ---
    const formFlujo = document.getElementById('form-flujo');
    const tbodyFlujo = document.getElementById('tbody-flujo-caja');

    const renderTablaFlujo = () => {
        tbodyFlujo.innerHTML = '';
        flujosEstructurados.sort((a, b) => a.periodo - b.periodo);

        let acum = leerNumero(document.getElementById('saldo-inicial')) || 0;
        flujosEstructurados.forEach((flujo) => {
            acum += flujo.flujoNeto;
            const tr = document.createElement('tr');
            const clase = flujo.flujoNeto >= 0 ? 'positivo' : 'negativo';
            tr.innerHTML = `
                <td>${flujo.periodo}</td>
                <td class="positivo">${formatoCOP.format(flujo.ingresos)}</td>
                <td class="negativo">${formatoCOP.format(flujo.egresos)}</td>
                <td class="${clase}" style="font-weight: bold;">${formatoCOP.format(flujo.flujoNeto)}</td>
                <td class="${acum >= 0 ? 'positivo' : 'negativo'}">${formatoCOP.format(acum)}</td>
                <td><button type="button" class="btn-danger btn-sm" data-periodo="${flujo.periodo}" aria-label="Eliminar período ${flujo.periodo}">X</button></td>
            `;
            tbodyFlujo.appendChild(tr);
        });
    };

    // Eliminar por período (más seguro que por índice)
    tbodyFlujo.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-periodo]');
        if (!btn) return;
        const periodo = parseInt(btn.dataset.periodo, 10);
        flujosEstructurados = flujosEstructurados.filter(f => f.periodo !== periodo);
        guardarFlujos();
        renderTablaFlujo();
    });

    formFlujo.addEventListener('submit', (e) => {
        e.preventDefault();
        const periodo = parseInt(document.getElementById('flujo-periodo').value, 10);
        const ingresos = leerNumero(document.getElementById('flujo-ingresos')) || 0;
        const egresos = leerNumero(document.getElementById('flujo-egresos')) || 0;

        if (isNaN(periodo) || periodo < 0) return alert('El período debe ser un entero mayor o igual a 0.');

        const nuevoFlujo = { periodo, ingresos, egresos, flujoNeto: ingresos - egresos };
        const existenteIndex = flujosEstructurados.findIndex(f => f.periodo === periodo);

        if (existenteIndex >= 0) {
            flujosEstructurados[existenteIndex] = nuevoFlujo;
        } else {
            flujosEstructurados.push(nuevoFlujo);
        }

        document.getElementById('flujo-periodo').value = periodo + 1;
        document.getElementById('flujo-ingresos').value = 0;
        document.getElementById('flujo-egresos').value = 0;

        guardarFlujos();
        renderTablaFlujo();
    });

    // --- 5. EVALUACIÓN DE PROYECTOS (VPN Y TIR) ---
    const calcularVPN = (flujos, tasa) =>
        flujos.reduce((acc, f) => acc + f.flujoNeto / Math.pow(1 + tasa, f.periodo), 0);

    function calcularTIR(flujos, maxIteraciones = 1000) {
        // Se requiere al menos un flujo negativo y uno positivo
        const hayNegativo = flujos.some(f => f.flujoNeto < 0);
        const hayPositivo = flujos.some(f => f.flujoNeto > 0);
        if (!hayNegativo || !hayPositivo) return null;

        let inferior = -0.99;
        let superior = 100.0;
        let vpnInferior = calcularVPN(flujos, inferior);
        const vpnSuperior = calcularVPN(flujos, superior);

        // Sin cambio de signo en el intervalo no hay raíz que bisectar
        if (vpnInferior * vpnSuperior > 0) return null;

        for (let i = 0; i < maxIteraciones; i++) {
            const medio = (inferior + superior) / 2;
            const vpnMedio = calcularVPN(flujos, medio);

            if (Math.abs(vpnMedio) < 0.01 || (superior - inferior) < 1e-10) return medio;

            if (vpnMedio * vpnInferior > 0) {
                inferior = medio;
                vpnInferior = vpnMedio;
            } else {
                superior = medio;
            }
        }
        return null;
    }

    document.getElementById('btn-calcular-evaluacion').addEventListener('click', () => {
        if (flujosEstructurados.length === 0) return alert('Registra flujos de caja primero.');

        const tio = parseFloat(document.getElementById('tasa-descuento').value) / 100;
        if (isNaN(tio) || tio <= -1) return alert('Ingresa una tasa de descuento válida (mayor a -100%).');

        const vpn = calcularVPN(flujosEstructurados, tio);
        const elVPN = document.getElementById('resultado-vpn');
        elVPN.textContent = formatoCOP.format(vpn);
        marcarResultado(elVPN, vpn);

        // Relación Beneficio/Costo = VP ingresos / VP egresos
        const vpIng = flujosEstructurados.reduce((a, f) => a + f.ingresos / Math.pow(1 + tio, f.periodo), 0);
        const vpEgr = flujosEstructurados.reduce((a, f) => a + f.egresos / Math.pow(1 + tio, f.periodo), 0);
        const elBC = document.getElementById('resultado-bc');
        elBC.textContent = vpEgr > 0 ? (vpIng / vpEgr).toFixed(2) : 'No calculable';
        if (vpEgr > 0) marcarResultado(elBC, vpIng / vpEgr - 1);

        // Período de recuperación (saldo acumulado >= 0)
        let ac = 0, rec = null;
        flujosEstructurados.forEach(f => { ac += f.flujoNeto; if (ac >= 0 && rec === null) rec = f.periodo; });
        document.getElementById('resultado-pr').textContent = rec === null ? 'No se recupera' : `Período ${rec}`;

        const tir = calcularTIR(flujosEstructurados);
        document.getElementById('resultado-tir').textContent =
            tir !== null ? `${(tir * 100).toFixed(2)}%` : 'No calculable (revisa los signos de los flujos)';

        const veredicto = document.getElementById('veredicto');
        veredicto.hidden = false;
        if (vpn > 0) {
            veredicto.textContent = tir !== null && tir > tio
                ? 'Proyecto viable: el VPN es positivo y la TIR supera la TIO.'
                : 'Proyecto viable: el VPN es positivo.';
        } else if (vpn === 0) {
            veredicto.textContent = 'Indiferente: el VPN es cero, el proyecto rinde exactamente la TIO.';
        } else {
            veredicto.textContent = 'Proyecto no viable: el VPN es negativo a esta tasa de descuento.';
        }
        marcarResultado(veredicto, vpn);
    });

    document.getElementById('saldo-inicial').addEventListener('input', renderTablaFlujo);

    // Mostrar flujos guardados al abrir la página
    renderTablaFlujo();
});