// ==UserScript==
// @name         GP-BOT Capitão - Farm CSS Completo
// @namespace    https://grepolis.com
// @version      2.4.0
// @description  Farme automático de aldeias bárbaras usando apenas cliques na interface, com config via Vercel (config por conta + integração com painel + heartbeat).
// @author       Você
// @match        https://*.grepolis.com/game/*
// @match        https://config-grepolis-bot.vercel.app/*
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      config-grepolis-bot.vercel.app
// ==/UserScript==

(function () {
    'use strict';

    const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    // ID único por navegador para identificar a instalação da extensão
    let gpClientId = null;
    try {
        gpClientId = GM_getValue('gpbot_clientId', null);
        if (!gpClientId) {
            gpClientId = 'client_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            GM_setValue('gpbot_clientId', gpClientId);
        }
    } catch (e) {
        console.warn('[AUTO] Não foi possível usar GM_getValue/GM_setValue para clientId:', e);
    }

    const PANEL_HOST      = 'config-grepolis-bot.vercel.app';
    const CONFIG_BASE_URL = 'https://config-grepolis-bot.vercel.app/api/get-config';
    const HEARTBEAT_URL   = 'https://config-grepolis-bot.vercel.app/api/heartbeat';

    // =====================================================================
    // 1) MODO PAINEL (quando você abre o painel no navegador)
    // =====================================================================
    if (location.hostname.includes(PANEL_HOST) && !location.hostname.includes('grepolis.com')) {
        try {
            const accountKey = GM_getValue('gpbot_accountKey', null);
            console.log('[AUTO] Painel aberto. AccountKey salva:', accountKey);

            if (!accountKey) {
                console.log('[AUTO] Nenhuma conta ativa encontrada para preencher no painel.');
                return;
            }

            function tryFillAccountField() {
                const selectors = [
                    '#account',
                    '#conta',
                    'input[name="account"]',
                    'input[name="conta"]',
                    'input[name="nick"]'
                ];

                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.value = accountKey;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('[AUTO] Campo de conta preenchido com', accountKey, 'usando seletor', sel);
                        return true;
                    }
                }
                return false;
            }

            // tenta preencher imediatamente
            if (tryFillAccountField()) return;

            // se o painel é SPA e demora pra montar o DOM, observa alterações
            const obs = new MutationObserver(() => {
                if (tryFillAccountField()) {
                    obs.disconnect();
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });

        } catch (e) {
            console.error('[AUTO] Erro no helper do painel:', e);
        }

        // não roda o bot do jogo neste host
        return;
    }

    // =====================================================================
    // 2) MODO JOGO (Grepolis) - BOT DE FARM
    // =====================================================================

    // --------- IDENTIFICAÇÃO DA CONTA (mundo + nick) ---------
    function getRawAccountKey() {
        try {
            const G = W.Game || {};
            const world  = G.world_id    || 'unknown_world';
            const player = G.player_name || 'unknown_player';

            const key = world + '_' + player;
            console.log('[AUTO] AccountKey detectado:', key);

            try {
                GM_setValue('gpbot_accountKey', key);
            } catch (e) {
                console.warn('[AUTO] Não foi possível salvar gpbot_accountKey:', e);
            }

            return key;
        } catch (e) {
            console.error('[AUTO] Erro obtendo chave da conta:', e);
            return 'default';
        }
    }

    // versão codificada para usar em URL (GET /api/get-config)
    function getAccountKey() {
        return encodeURIComponent(getRawAccountKey());
    }

    // SELETORES QUE VOCÊ MANDOU
    const BTN_OPEN_OVERVIEW = '#overviews_link_hover_menu > div.box.middle.left > div > div > ul > li.subsection.captain.enabled > ul > li.farm_town_overview > a';
    const BTN_SELECT_ALL    = '#fto_town_wrapper > div > div.game_header.bold > span.checkbox_wrapper > a';
    const BTN_CLAIM         = '#fto_claim_button > div.caption.js-caption > span';
    const OVERVIEW_WRAPPER  = '#fto_town_wrapper';

    let gpConfig         = null;
    let farmTimer        = null;
    let autoFarmStarted  = false;
    let heartbeatTimer   = null;

    // ------------------- UTILS -------------------
    function log(...args) {
        console.log('[AUTO]', ...args);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    function qs(sel) {
        return W.document.querySelector(sel);
    }

    function isClickable(el) {
        if (!el) return false;
        if (el.disabled) return false;
        if (el.classList && (el.classList.contains('disabled') || el.classList.contains('inactive'))) return false;
        return true;
    }

    // Esperar até que um seletor fique clicável (ou estourar tempo)
    async function waitUntilClickable(selector, label, maxMs = 4000, interval = 200) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const el = qs(selector);
            if (isClickable(el)) {
                log(`Elemento ficou clicável: ${label}`);
                return true;
            }
            await sleep(interval);
        }
        log(`Timeout esperando ${label} ficar clicável.`);
        return false;
    }

    // ---------------- HTTP (GM_xmlhttpRequest) ---------------
    function gmFetchJson(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { "Accept": "application/json" },
                onload: function (resp) {
                    try {
                        if (resp.status >= 200 && resp.status < 300) {
                            resolve(JSON.parse(resp.responseText));
                        } else {
                            reject("HTTP " + resp.status);
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function () {
                    reject("GM_xmlhttpRequest error");
                }
            });
        });
    }

    // Heartbeat para o painel saber quais contas estão online
    function sendHeartbeat(rawAccountKey) {
        if (!rawAccountKey || !gpClientId) return;

        const payload = {
            account: rawAccountKey,  // ex: br14_ANDE LUZ E MARIA
            clientId: gpClientId
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: HEARTBEAT_URL,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(payload),
            onload: function (resp) {
                if (resp.status >= 200 && resp.status < 300) {
                    // opcional: log leve
                    // log('Heartbeat OK para', rawAccountKey);
                } else {
                    console.warn('[AUTO] Heartbeat falhou:', resp.status);
                }
            },
            onerror: function () {
                console.warn('[AUTO] Erro de rede no heartbeat');
            }
        });
    }

    // ---------------- CARREGAR CONFIG ----------------
    async function loadConfig() {
        try {
            const accountKey = getAccountKey(); // usa mundo + nick (codificado)
            const url = `${CONFIG_BASE_URL}?account=${accountKey}&t=${Date.now()}`;
            log('Carregando config da conta:', accountKey, 'URL:', url);

            const json = await gmFetchJson(url);
            gpConfig = json.config || json;
            log('Config carregada para', accountKey, ':', gpConfig);
        } catch (e) {
            console.error('[AUTO] Erro carregando config:', e);
        }
    }

    // --------------- CLIQUES GENÉRICOS ----------------
    async function clickSelector(selector, label, wait = 300) {
        const el = qs(selector);
        if (!el) {
            log(`Elemento não encontrado: ${label} (${selector})`);
            return false;
        }
        if (!isClickable(el)) {
            log(`Elemento desabilitado: ${label}`);
            return false;
        }

        try {
            log(`Clicando em: ${label}`);
            el.click();
            if (W.$) {
                // refaz o clique via jQuery para imitar o jogo
                W.$(el).trigger('click');
            }
            await sleep(wait);
            return true;
        } catch (e) {
            console.error(`Erro ao clicar em ${label}:`, e);
            return false;
        }
    }

    async function waitForOverviewOpen(maxMs = 5000) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            if (qs(OVERVIEW_WRAPPER)) {
                return true;
            }
            await sleep(200);
        }
        return !!qs(OVERVIEW_WRAPPER);
    }

    // --------------- UM CICLO DE FARM (CSS PURO) ----------------
    async function runFarmOnceCSS() {
        // sempre recarrega config antes de cada ciclo
        await loadConfig();

        if (!gpConfig || !gpConfig.enabled) {
            log('Bot desativado no painel (enabled = false).');
            scheduleNextFarm();
            return;
        }

        const farm = gpConfig.farm || {};
        if (!farm.enabled) {
            log('Farm desativado no painel (farm.enabled = false).');
            scheduleNextFarm();
            return;
        }

        log('Iniciando ciclo automático (CSS simples)...');

        // 1) Abre Aldeias Bárbaras via Capitão
        await clickSelector(BTN_OPEN_OVERVIEW, 'Abrir Aldeias Bárbaras (menu)', 1200);

        const opened = await waitForOverviewOpen(5000);
        if (!opened) {
            log('Não consegui abrir a visão geral das aldeias bárbaras. Tentarei no próximo ciclo.');
            scheduleNextFarm();
            return;
        }

        // 2) Selecionar todas as aldeias UMA VEZ e esperar a resposta do jogo
        log('Clicando em "Selecionar todas as aldeias"...');
        await clickSelector(BTN_SELECT_ALL, 'Selecionar todas as aldeias (SelectAll)', 600);

        // Espera o botão "Coletar" ficar clicável (jogo processar seleção)
        let claimReady = await waitUntilClickable(BTN_CLAIM, 'Botão Coletar', 4000);

        if (!claimReady) {
            log('Botão Coletar não ficou ativo após o primeiro clique em Selecionar Todas. Tentando novamente...');
            await clickSelector(BTN_SELECT_ALL, 'Selecionar todas as aldeias (SelectAll) - segunda tentativa', 800);
            claimReady = await waitUntilClickable(BTN_CLAIM, 'Botão Coletar', 4000);
        }

        if (!claimReady) {
            log('AVISO: Mesmo após tentar duas vezes, o botão Coletar não ficou ativo. Vou tentar novamente no próximo ciclo.');
            scheduleNextFarm();
            return;
        }

        log('Seleção confirmada. Indo clicar em Coletar.');

        // 3) Clicar no botão Coletar
        const clickedClaim = await clickSelector(BTN_CLAIM, 'Botão Coletar', 800);

        if (!clickedClaim) {
            log('AVISO: Botão Coletar não foi clicado (pode ter ficado desabilitado de novo).');
        } else {
            log('Clique em Coletar enviado com sucesso.');
        }

        log('Ciclo automático concluído (CSS).');
        scheduleNextFarm();
    }

    // --------------- AGENDAMENTO ----------------
    function scheduleNextFarm() {
        if (!autoFarmStarted) return;

        if (farmTimer) clearTimeout(farmTimer);

        const farm = gpConfig ? (gpConfig.farm || {}) : {};

        let min = Number(farm.interval_min || 600); // padrão 10 min
        let max = Number(farm.interval_max || 600);

        if (max < min) max = min;

        const delay = randomInt(min, max);

        log(`Próximo ciclo em ~${delay}s (janela ${min}–${max}s).`);

        farmTimer = setTimeout(() => {
            runFarmOnceCSS().catch(err => console.error('[AUTO] Erro no ciclo CSS:', err));
        }, delay * 1000);
    }

    // --------------- INIT ----------------
    async function init() {
        await loadConfig();

        autoFarmStarted = true;
        log('Bot pronto. Modo automático CSS ativado.');

        // Inicia heartbeat para a conta atual
        const rawKey = getRawAccountKey();
        if (rawKey && gpClientId) {
            if (heartbeatTimer) clearInterval(heartbeatTimer);

            // envia um heartbeat imediato
            sendHeartbeat(rawKey);

            // e depois a cada 60s
            heartbeatTimer = setInterval(() => {
                sendHeartbeat(rawKey);
            }, 60000);
        }

        scheduleNextFarm();
    }

    async function waitForGame() {
        for (let i = 0; i < 40; i++) { // até ~40s
            if (W.$ && W.location.href.includes('/game/')) {
                log('Jogo detectado, iniciando bot (CSS apenas).');
                init().catch(e => console.error('[AUTO] Erro no init:', e));
                return;
            }
            await sleep(1000);
        }
        console.error('[AUTO] Erro: jogo não detectado.');
    }

    waitForGame();
})();
