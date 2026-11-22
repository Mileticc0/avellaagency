/* Avella chat – čist JavaScript, bez frameworka.
   Radi u dva režima:
   1) AI režim: kad je WORKER_URL upisan, pitanja idu Cloudflare Workeru (Claude API).
   2) Rezervni režim: bez Workera (ili kad ne odgovara) – vođeni razgovor sa dugmićima iz chat-znanje.json.
*/
(function () {
  "use strict";

  /* ======================= PODEŠAVANJA ======================= */
  // Adresa Cloudflare Workera, npr. "https://avella-chat.tvoje-ime.workers.dev"
  // Dok je prazno, chat radi u rezervnom režimu (dugmići).
  var WORKER_URL = "https://avella-chat.mileticmixajlo.workers.dev";
  // Web3Forms ključ – isti kao u formi na kontakt.html
  var ACCESS_KEY = "11af7b16-7fd4-497c-998e-aa7419478e18";
  var MAX_USER_MSGS = 40;   // max poruka ka AI po razgovoru (isto proverava i Worker)
  var MAX_LEN = 1000;       // max znakova po poruci
  /* =========================================================== */

  if (window.__avcLoaded) return;
  window.__avcLoaded = true;
  if (typeof window.AVELLA_CHAT_URL === "string") WORKER_URL = window.AVELLA_CHAT_URL;

  var SCRIPT = document.currentScript;
  var BASE = (function () {
    try { return new URL(".", SCRIPT ? SCRIPT.src : location.href).href.replace(/assets\/$/, ""); }
    catch (e) { return "/"; }
  })();
  var KEY = "avella-chat-v1";
  var RM = matchMedia("(prefers-reduced-motion: reduce)");
  var MOBILE = matchMedia("(max-width: 640px)");

  /* ---------------- tekstovi interfejsa ---------------- */
  var T = {
    sr: {
      open: "Otvori chat sa Avellom", close: "Zatvori chat", menu: "Meni", newChat: "Novi razgovor",
      sub: "Automatski asistent · odgovor odmah", hint: "Pitajte za cenu",
      ph: "Napišite pitanje…", send: "Pošalji poruku", log: "Razgovor",
      greet: "Zdravo! Mogu da Vam kažem cene paketa, koliko traje izrada ili da preporučim paket za Vaš biznis.",
      greetAI: "Zdravo! Pitajte me šta god Vas zanima: cene i pakete za sajt ili bilo šta drugo.",
      c_prices: "Cene paketa", c_rec: "Preporuči mi paket", c_time: "Koliko traje izrada", c_maint: "Šta je u održavanju",
      c_contact: "Kontakt", c_lead: "Pošalji upit", c_wa: "Pišite na WhatsApp", c_mail: "Pošalji email",
      leadAsk: "Ostavite ime i broj telefona ili WhatsApp, javljamo se u roku od 24h.",
      f_name: "Ime", f_tel: "Telefon / WhatsApp", f_mail: "Email (opciono)", f_send: "Pošalji upit", f_sending: "Šaljem…",
      f_later: "Ne sada", f_prv: "Slanjem prihvatate ", f_prvL: "Politiku privatnosti",
      e_name: "Upišite ime.", e_tel: "Upišite ispravan broj, npr. +382 68 123 456.", e_mail: "Email adresa nije ispravna.",
      sent: "Hvala, upit je stigao. Javljamo se u roku od 24h.",
      sendFail: "Slanje nije uspelo. Pišite nam na WhatsApp ili na avellagency@gmail.com.",
      offline: "Niste povezani na internet. Kad se veza vrati, pokušajte ponovo ili nam pišite na WhatsApp.",
      limit: "Za danas je to limit razgovora. Pišite nam na WhatsApp +382 68 485 267.",
      loadFail: "Trenutno ne mogu da učitam odgovore. Pišite nam na WhatsApp ili na avellagency@gmail.com.",
      recPick: "Preporučujem paket {n}: {p} € + {m} €/mes. {f} Sve stavke: uporedi.html",
      recAsk: "Za više od 500 proizvoda najbolje je da Vam Mihajlo kaže direktno.",
      pkInfo: "{n}: {p} € + {m} €/mes. {f} Uključuje: {it} i još. Sve stavke: uporedi.html",
      hello: "Zdravo! Pitajte me za cene, rokove ili da Vam preporučim paket.",
      thanks: "Nema na čemu. Ako želite ponudu, ostavite kontakt i javljamo se u roku od 24h.",
      waText: "Zdravo, zanima me izrada sajta.", newDone: "Započet je novi razgovor.",
      tooLong: "Poruka je predugačka (max 1000 znakova)."
    },
    en: {
      open: "Open chat with Avella", close: "Close chat", menu: "Menu", newChat: "New chat",
      sub: "Automated assistant · instant answers", hint: "Ask about prices",
      ph: "Type your question…", send: "Send message", log: "Conversation",
      greet: "Hi! I can tell you package prices, how long a build takes, or recommend a package for your business.",
      greetAI: "Hi! Ask me anything: website prices and packages, or anything else.",
      c_prices: "Package prices", c_rec: "Recommend a package", c_time: "How long it takes", c_maint: "What maintenance includes",
      c_contact: "Contact", c_lead: "Send inquiry", c_wa: "Message on WhatsApp", c_mail: "Send email",
      leadAsk: "Leave your name and phone or WhatsApp number and we'll get back to you within 24h.",
      f_name: "Name", f_tel: "Phone / WhatsApp", f_mail: "Email (optional)", f_send: "Send inquiry", f_sending: "Sending…",
      f_later: "Not now", f_prv: "By sending you accept the ", f_prvL: "Privacy policy",
      e_name: "Enter your name.", e_tel: "Enter a valid number, e.g. +382 68 123 456.", e_mail: "Email address is not valid.",
      sent: "Thank you, your inquiry has arrived. We'll get back to you within 24h.",
      sendFail: "Sending failed. Message us on WhatsApp or at avellagency@gmail.com.",
      offline: "You're offline. Try again when you're back online, or message us on WhatsApp.",
      limit: "That's the chat limit for today. Message us on WhatsApp at +382 68 485 267.",
      loadFail: "I can't load answers right now. Message us on WhatsApp or at avellagency@gmail.com.",
      recPick: "I recommend {n}: €{p} + €{m}/mo. {f} Full list: uporedi.html",
      recAsk: "For more than 500 products, Mihajlo is the best person to tell you directly.",
      pkInfo: "{n}: €{p} + €{m}/mo. {f} Includes: {it} and more. Full list: uporedi.html",
      hello: "Hi! Ask me about prices, timelines, or let me recommend a package.",
      thanks: "You're welcome. If you'd like a quote, leave your contact and we'll reply within 24h.",
      waText: "Hi, I'm interested in a website.", newDone: "New chat started.",
      tooLong: "Message is too long (max 1000 characters)."
    }
  };

  /* ---------------- ikonice (Lucide) ---------------- */
  var svg = function (p, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  };
  var I = {
    chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', "i-chat"),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', "i-x"),
    x2: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    dots: svg('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'),
    send: svg('<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>'),
    reset: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.44-9.43a9.4 9.4 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.3 11.3 0 0 0 12.05.71C5.79.71.7 5.8.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.33 11.33 0 0 0 5.42 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.31-8.02"/></svg>'
  };

  /* ---------------- stanje ---------------- */
  var S = load() || fresh();
  var KB = null;            // znanje (chat-znanje.json)
  var kbPromise = null;
  var busy = false;
  var aiDown = false;       // Worker ne odgovara – ostatak sesije rezervni režim
  var built = false, root, fab, hint, panel, log, input, sendBtn, countEl, waLink, menuBtn, menu, scrim, live, titleSub;
  var lastFocus = null;

  function fresh() { return { msgs: [], st: { biz: "", pkg: "", rec: {}, lead: "", n: 0 }, open: false, hinted: false }; }
  function load() { try { var s = JSON.parse(sessionStorage.getItem(KEY)); return s && s.msgs ? s : null; } catch (e) { return null; } }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function lang() { return /^en/i.test(document.documentElement.lang || "") ? "en" : "sr"; }
  function t(k) { return (T[lang()] || T.sr)[k]; }
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }
  function track(name, p) { try { if (typeof window.gtag === "function") window.gtag("event", name, p || {}); } catch (e) {} }
  function aiOn() { return !!WORKER_URL && !aiDown; }
  function waHref() { return "https://wa.me/38268485267?text=" + encodeURIComponent(t("waText")); }

  /* ---------------- pokretanje (posle load, ne usporava sajt) ---------------- */
  function boot() {
    buildFab();
    var shown = false;
    var show = function () {
      if (shown) return; shown = true;
      removeEventListener("scroll", show);
      requestAnimationFrame(function () { fab.classList.add("is-in"); maybeHint(); });
    };
    setTimeout(show, 1500);
    addEventListener("scroll", show, { passive: true, once: true });
    if (S.open && !MOBILE.matches) { show(); openChat(true); }
  }
  if (document.readyState === "complete") setTimeout(boot, 0);
  else addEventListener("load", function () { setTimeout(boot, 0); });

  function buildFab() {
    root = document.createElement("div");
    root.className = "avc";
    root.innerHTML =
      '<button type="button" class="avc-fab" aria-haspopup="dialog" aria-expanded="false" aria-controls="avc-panel">' + I.chat + I.x + "</button>" +
      '<div class="avc-hint" aria-hidden="true"></div>';
    document.body.appendChild(root);
    fab = root.querySelector(".avc-fab");
    hint = root.querySelector(".avc-hint");
    fab.addEventListener("click", function () { root.classList.contains("is-open") ? closeChat() : openChat(); });
    labelFab();
    new MutationObserver(onLang).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  function labelFab() { fab.setAttribute("aria-label", root.classList.contains("is-open") ? t("close") : t("open")); hint.textContent = t("hint"); }

  function maybeHint() {
    if (S.hinted || MOBILE.matches || !matchMedia("(hover:hover)").matches) return;
    S.hinted = true; save();
    hint.classList.add("is-in");
    var off = function () { hint.classList.remove("is-in"); removeEventListener("scroll", off); };
    setTimeout(off, 6000);
    setTimeout(function () { addEventListener("scroll", off, { passive: true }); }, 300);
    fab.addEventListener("click", off, { once: true });
  }

  /* ---------------- panel ---------------- */
  function buildPanel() {
    if (built) return; built = true;
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="avc-scrim" aria-hidden="true"></div>' +
      '<section class="avc-panel" id="avc-panel" role="dialog" aria-labelledby="avc-title" data-lenis-prevent>' +
        '<div class="avc-handle" aria-hidden="true"></div>' +
        '<header class="avc-head">' +
          '<span class="avc-logo"><img src="' + BASE + 'assets/a-mark.png" alt="" width="20" height="20"></span>' +
          '<div class="avc-title"><b id="avc-title">Avella</b><small class="avc-sub"></small></div>' +
          '<div class="avc-menuwrap"><button type="button" class="avc-ib avc-menubtn" aria-haspopup="menu" aria-expanded="false">' + I.dots + "</button>" +
            '<div class="avc-menu" role="menu" hidden><button type="button" role="menuitem" class="avc-reset">' + I.reset + "<span></span></button></div></div>" +
          '<button type="button" class="avc-ib avc-x">' + I.x2 + "</button>" +
        "</header>" +
        '<div class="avc-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="-1"></div>' +
        '<div class="avc-foot">' +
          '<form class="avc-compose" novalidate>' +
            '<label class="avc-sr" for="avc-in"></label>' +
            '<textarea id="avc-in" class="avc-input" rows="1" maxlength="' + (MAX_LEN + 200) + '" enterkeyhint="send" autocomplete="off"></textarea>' +
            '<button type="submit" class="avc-send" disabled>' + I.send + "</button>" +
          "</form>" +
          '<div class="avc-sub"><a class="avc-wa" target="_blank" rel="noopener">' + I.wa + "<span>WhatsApp</span></a><span class=\"avc-count\" aria-live=\"polite\"></span></div>" +
        "</div>" +
        '<div class="avc-sr" aria-live="assertive"></div>' +
      "</section>";
    while (wrap.firstChild) root.appendChild(wrap.firstChild);
    scrim = root.querySelector(".avc-scrim");
    panel = root.querySelector(".avc-panel");
    log = root.querySelector(".avc-log");
    input = root.querySelector(".avc-input");
    sendBtn = root.querySelector(".avc-send");
    countEl = root.querySelector(".avc-count");
    waLink = root.querySelector(".avc-wa");
    menuBtn = root.querySelector(".avc-menubtn");
    menu = root.querySelector(".avc-menu");
    titleSub = root.querySelector(".avc-sub");
    live = root.querySelector(".avc-sr[aria-live=assertive]");

    root.querySelector(".avc-x").addEventListener("click", closeChat);
    scrim.addEventListener("click", closeChat);
    root.querySelector(".avc-compose").addEventListener("submit", function (e) { e.preventDefault(); submitText(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submitText(); }
    });
    input.addEventListener("input", onInput);
    menuBtn.addEventListener("click", function () { toggleMenu(menu.hidden); });
    root.querySelector(".avc-reset").addEventListener("click", function () { toggleMenu(false); resetChat(); });
    waLink.addEventListener("click", function () { track("contact_click", { method: "whatsapp", source: "chat" }); });
    panel.addEventListener("keydown", onPanelKey);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("is-open") && !panel.contains(e.target)) closeChat(); });
    document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".avc-menuwrap")) toggleMenu(false); });
    log.addEventListener("click", onLogClick);
    initSheet();
    initViewport();
    applyLang();
  }

  function applyLang() {
    if (!built) return;
    panel.setAttribute("aria-label", "Avella chat");
    titleSub.textContent = t("sub");
    menuBtn.setAttribute("aria-label", t("menu"));
    root.querySelector(".avc-reset span").textContent = t("newChat");
    root.querySelector(".avc-x").setAttribute("aria-label", t("close"));
    root.querySelector('label[for="avc-in"]').textContent = t("ph");
    input.placeholder = t("ph");
    sendBtn.setAttribute("aria-label", t("send"));
    log.setAttribute("aria-label", t("log"));
    waLink.href = waHref();
    waLink.setAttribute("aria-label", "WhatsApp – " + t("c_wa"));
  }
  function onLang() {
    labelFab();
    if (!built) return;
    applyLang();
    renderTail(); // dugmići i forma se prevode odmah; stare poruke ostaju kako su napisane
  }

  function openChat(silent) {
    buildPanel();
    lastFocus = document.activeElement;
    if (!S.msgs.length) greet();
    render();
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    labelFab();
    panel.setAttribute("aria-modal", MOBILE.matches ? "true" : "false");
    if (MOBILE.matches) lockPage(true);
    S.open = true; save();
    loadKB();
    if (!silent) {
      track("chat_open", { mode: aiOn() ? "ai" : "fallback" });
      // na telefonu ne otvaramo tastaturu odmah – korisnik prvo vidi dugmiće
      setTimeout(function () { (MOBILE.matches ? panel.querySelector(".avc-x") : input).focus({ preventScroll: true }); }, RM.matches ? 0 : 60);
    }
    scrollEnd(true);
  }
  function closeChat() {
    if (!root.classList.contains("is-open")) return;
    toggleMenu(false);
    root.classList.remove("is-open");
    panel.style.transform = "";
    fab.setAttribute("aria-expanded", "false");
    labelFab();
    lockPage(false);
    S.open = false; save();
    fab.focus({ preventScroll: true });
  }

  var locked = false, savedOverflow = "";
  function lockPage(on) {
    if (on === locked) return; locked = on;
    var html = document.documentElement;
    if (on) { savedOverflow = html.style.overflow; html.style.overflow = "hidden"; if (window.__lenis) window.__lenis.stop(); }
    else { html.style.overflow = savedOverflow; if (window.__lenis) window.__lenis.start(); }
  }
  MOBILE.addEventListener && MOBILE.addEventListener("change", function () {
    if (!built || !root.classList.contains("is-open")) return;
    panel.setAttribute("aria-modal", MOBILE.matches ? "true" : "false");
    lockPage(MOBILE.matches);
  });

  function toggleMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("button").focus();
  }

  function onPanelKey(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!menu.hidden) { toggleMenu(false); menuBtn.focus(); } else closeChat();
      return;
    }
    if (e.key === "Tab") { // fokus ostaje u panelu dok je otvoren
      var f = [].filter.call(panel.querySelectorAll('button,a[href],input,textarea,[tabindex]:not([tabindex="-1"])'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function resetChat() {
    S = fresh(); S.open = true; S.hinted = true;
    greet(); render(); save();
    live.textContent = t("newDone");
    input.value = ""; onInput();
    input.focus({ preventScroll: true });
  }

  /* ---------------- poruke ---------------- */
  function greet() { S.msgs.push({ r: "a", t: t(aiOn() ? "greetAI" : "greet"), k: "start" }); }
  function add(r, text, k, extra) {
    var m = { r: r, t: text }; if (k) m.k = k; if (extra) for (var x in extra) m[x] = extra[x];
    S.msgs.push(m); save();
    if (built) { appendMsg(m, true); renderTail(); scrollEnd(); }
    return m;
  }

  function render() {
    log.innerHTML = "";
    S.msgs.forEach(function (m) { appendMsg(m, false); });
    renderTail();
  }
  function appendMsg(m, anim) {
    var el = document.createElement("div");
    el.className = "avc-msg avc-" + m.r + (m.err ? " avc-err" : "") + (anim ? " avc-new" : "");
    el.innerHTML = rich(m.t);
    log.appendChild(el);
    return el;
  }

  // dugmići / forma ispod poslednje poruke
  function renderTail() {
    var old = log.querySelector(".avc-tail"); if (old) old.remove();
    var last = S.msgs[S.msgs.length - 1];
    var box = document.createElement("div");
    box.className = "avc-tail";
    if (S.st.lead === "form") box.appendChild(leadForm());
    else if (last && last.r === "a" && !busy) {
      var chips = chipsFor(last.k);
      if (chips.length) {
        var c = document.createElement("div");
        c.className = "avc-chips";
        chips.forEach(function (ch) {
          var b = document.createElement(ch.href ? "a" : "button");
          b.className = "avc-chip" + (ch.gold ? " avc-gold" : "");
          b.textContent = ch.label;
          if (ch.href) { b.href = ch.href; if (/^https?:/.test(ch.href)) { b.target = "_blank"; b.rel = "noopener"; } }
          else { b.type = "button"; b.dataset.act = ch.act; if (ch.v) b.dataset.v = ch.v; }
          c.appendChild(b);
        });
        box.appendChild(c);
      }
    }
    if (box.childNodes.length) { box.classList.add("avc-new"); log.appendChild(box); }
  }

  function chipsFor(k) {
    var L = lang();
    var menuChips = [
      { act: "prices", label: t("c_prices") }, { act: "time", label: t("c_time") }, { act: "maint", label: t("c_maint") },
      { act: "rec", label: t("c_rec") }, { act: "contact", label: t("c_contact") }
    ];
    if (k === "start") return [
      { act: "prices", label: t("c_prices") }, { act: "rec", label: t("c_rec") },
      { act: "time", label: t("c_time") }, { act: "lead", label: t("c_lead"), gold: true }
    ];
    if (k === "ai") return [];
    if (k === "ai-offer") return [{ act: "lead", label: t("c_lead"), gold: true }];
    if (k === "rec1" || k === "rec2" || k === "rec3site" || k === "rec3shop") {
      if (!KB) return [];
      var q = KB.recommend[recKey(k)];
      return q.opts.map(function (o) { return { act: "ans", v: o.v, label: o[L] }; });
    }
    if (k === "picked" || k === "lead") return [{ act: "lead", label: t("c_lead"), gold: true }, { act: "prices", label: t("c_prices") }, { act: "contact", label: t("c_contact") }];
    if (k === "err") return [{ href: waHref(), label: t("c_wa"), gold: true }, { href: "mailto:avellagency@gmail.com", label: t("c_mail") }];
    if (k === "limit") return [{ href: waHref(), label: t("c_wa"), gold: true }, { act: "lead", label: t("c_lead") }];
    if (k === "sent") return [];
    return menuChips.concat([{ act: "lead", label: t("c_lead"), gold: true }]);
  }

  function recKey(k) { return { rec1: "q1", rec2: "q2site", rec3site: "q3site", rec3shop: "q3shop" }[k]; }

  function onLogClick(e) {
    var b = e.target.closest("button[data-act]");
    if (!b || busy) return;
    var act = b.dataset.act;
    if (act === "ans") return answerRec(b.dataset.v, b.textContent);
    if (act === "lead") { add("u", b.textContent); return showLead(); }
    if (act === "rec") { add("u", b.textContent); return startRec(); }
    // ostali dugmići: u AI režimu idu kao pitanje AI-u, u rezervnom režimu odgovor iz znanja
    if (aiOn() && S.st.n < MAX_USER_MSGS) return send(b.textContent);
    add("u", b.textContent);
    withKB(function () { topic(act); });
  }

  /* ---------------- unos ---------------- */
  function onInput() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
    var n = input.value.length;
    sendBtn.disabled = busy || !input.value.trim() || n > MAX_LEN;
    countEl.textContent = n > MAX_LEN * 0.8 ? n + " / " + MAX_LEN : "";
    countEl.classList.toggle("avc-over", n > MAX_LEN);
  }
  function submitText() {
    var v = input.value.replace(/\s+$/g, "").replace(/^\s+/g, "");
    if (!v || busy) return;
    if (v.length > MAX_LEN) { live.textContent = t("tooLong"); return; }
    input.value = ""; onInput();
    send(v);
  }

  function send(text) {
    add("u", text);
    track("chat_message", { mode: aiOn() ? "ai" : "fallback" });
    if (!navigator.onLine) return add("a", t("offline"), "err", { err: 1 });
    if (S.st.lead === "form") { S.st.lead = ""; save(); }
    if (aiOn()) {
      if (S.st.n >= MAX_USER_MSGS) return add("a", t("limit"), "limit");
      S.st.n++; save();
      return askAI();
    }
    withKB(function () { fallback(text); });
  }

  /* ---------------- AI režim (streaming) ---------------- */
  function askAI() {
    setBusy(true);
    var typing = showTyping();
    var ctrl = window.AbortController ? new AbortController() : null;
    var gotFirst = false;
    var firstTimer = setTimeout(function () { if (!gotFirst && ctrl) ctrl.abort(); }, 20000);
    var totalTimer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
    var el = null, raw = "";

    var msgs = history();
    fetch(WORKER_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, lang: lang(), page: location.pathname }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (res.status === 429) { var e = new Error("limit"); e.limit = true; throw e; }
      if (!res.ok || !res.body) throw new Error("http " + res.status);
      var reader = res.body.getReader(), dec = new TextDecoder();
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          var chunk = dec.decode(r.value, { stream: true });
          if (!gotFirst && chunk) { gotFirst = true; typing.remove(); el = appendMsg({ r: "a", t: "" }, true); el.setAttribute("aria-hidden", "true"); }
          raw += chunk;
          el.innerHTML = rich(clean(raw, true));
          scrollEnd(true);
          return pump();
        });
      }
      return pump();
    }).then(function () {
      clearTimeout(firstTimer); clearTimeout(totalTimer);
      if (!gotFirst || !raw.trim()) throw new Error("empty");
      var text = clean(raw, false);
      var pk = raw.match(/\[PAKET:\s*([^\]]+)\]/i); if (pk) S.st.pkg = pk[1].trim();
      var wantsLead = /\[UPIT\]/i.test(raw);
      var offer = !wantsLead && /\[PONUDA\]/i.test(raw);
      el.remove();
      S.msgs.push({ r: "a", t: text, k: offer ? "ai-offer" : "ai" });
      appendMsg(S.msgs[S.msgs.length - 1], false);
      setBusy(false);
      if (wantsLead) showLead(true); else renderTail();
      save(); scrollEnd();
    }).catch(function (err) {
      clearTimeout(firstTimer); clearTimeout(totalTimer);
      typing.remove(); if (el) el.remove();
      setBusy(false);
      if (err && err.limit) { S.st.n = MAX_USER_MSGS; save(); return add("a", t("limit"), "limit"); }
      if (!navigator.onLine) return add("a", t("offline"), "err", { err: 1 });
      // Worker ne radi → ostatak razgovora u rezervnom režimu, korisnik i dalje dobija odgovor
      aiDown = true;
      var lastUser = "";
      for (var i = S.msgs.length - 1; i >= 0; i--) if (S.msgs[i].r === "u") { lastUser = S.msgs[i].t; break; }
      withKB(function () { fallback(lastUser); });
    });
  }

  function history() {
    var out = [];
    S.msgs.forEach(function (m) {
      if (!m.t || m.err) return;
      var role = m.r === "u" ? "user" : "assistant";
      if (!out.length && role === "assistant") return;
      var prev = out[out.length - 1];
      if (prev && prev.role === role) prev.content += "\n" + m.t;
      else out.push({ role: role, content: m.t.slice(0, MAX_LEN) });
    });
    return out.slice(-(MAX_USER_MSGS * 2 + 2));
  }
  function clean(s, streaming) {
    s = s.replace(/\[(UPIT|PONUDA|PAKET:[^\]]*)\]/gi, "").replace(/\*\*/g, "").replace(/^#{1,4}\s+/gm, "").replace(/\\(?=\n|$)/g, "");
    if (streaming) s = s.replace(/\[[^\]]{0,40}$/, ""); // ne prikazuj poluotkucanu oznaku
    return s.replace(/[ \t]+\n/g, "\n").trim();
  }

  function showTyping() {
    var d = document.createElement("div");
    d.className = "avc-typing avc-new";
    d.setAttribute("aria-hidden", "true");
    d.innerHTML = "<i></i><i></i><i></i>";
    var tail = log.querySelector(".avc-tail"); if (tail) tail.remove();
    log.appendChild(d); scrollEnd();
    return d;
  }
  function setBusy(b) { busy = b; if (built) { onInput(); if (b) { var tail = log.querySelector(".avc-tail"); if (tail) tail.remove(); } } }

  /* ---------------- rezervni režim (bez AI) ---------------- */
  function loadKB() {
    if (KB || kbPromise) return kbPromise;
    kbPromise = fetch(BASE + "assets/chat-znanje.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { KB = j; if (built) renderTail(); return j; })
      .catch(function () { kbPromise = null; return null; });
    return kbPromise;
  }
  function withKB(fn) {
    if (KB) return fn();
    var p = loadKB();
    if (!p) return add("a", t("loadFail"), "err", { err: 1 });
    p.then(function (j) { if (j) fn(); else add("a", t("loadFail"), "err", { err: 1 }); });
  }

  function topic(id) {
    var L = lang(), tp = KB.topics;
    var map = { prices: "prices", time: "time", maint: "maintenance", contact: "contact" };
    if (id === "lead") return showLead();
    if (id === "rec") return startRec();
    var x = tp[map[id] || id];
    add("a", x ? x[L] : tp.unknown[L], id === "contact" ? "lead" : "menu");
  }

  function norm(s) {
    var cyr = { "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"dj","е":"e","ж":"z","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"c","у":"u","ф":"f","х":"h","ц":"c","ч":"c","џ":"dz","ш":"s" };
    return (" " + s.toLowerCase() + " ").replace(/[а-џ]/g, function (c) { return cyr[c] != null ? cyr[c] : c; })
      .replace(/đ/g, "dj").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  }
  function has(s, words) { for (var i = 0; i < words.length; i++) if (s.indexOf(words[i]) > -1) return true; return false; }

  function fallback(text) {
    var L = lang(), s = norm(text), tp = KB.topics;
    // korisnik kuca umesto da klikne odgovor u preporuci
    var last = S.msgs.length > 1 ? S.msgs[S.msgs.length - 2] : null;
    if (last && /^rec/.test(last.k || "")) {
      var q = KB.recommend[recKey(last.k)];
      for (var i = 0; i < q.opts.length; i++) if (s.indexOf(norm(q.opts[i][L]).trim()) > -1 || s.indexOf(" " + q.opts[i].v + " ") > -1) return answerRec(q.opts[i].v, text, true);
    }
    if (has(s, [" bot", "covek", "robot", " ai ", "vestack", "human", "real person", "ziva osoba", "are you real"])) return add("a", tp.bot[L], "menu");
    if (has(s, ["popust", "jeftin", "snizen", "discount", "cheaper", "negotiat", "pregovar"])) return add("a", tp.discount[L], "lead");
    if (has(s, ["upit", "ponud", "hocu", "zelim sajt", "zelim da", "narucim", "narucit", "kako da pocnem", "pocnemo", "quote", "i want", "order", "get started", "interested", "zainteres"])) return showLead();
    if (has(s, ["preporu", "koji paket", "koji mi", "sta mi treba", "recommend", "which package", "suggest", "what do i need"])) return startRec();
    var all = KB.packages.site.concat(KB.packages.shop).sort(function (a, b) { return b.n.length - a.n.length; });
    for (var j = 0; j < all.length; j++) if (s.indexOf(norm(all[j].n).trim()) > -1) return pkInfo(all[j]);
    if (has(s, ["traje", "rok ", "rokovi", "koliko dana", "brzo", "kada bude", "how long", "deadline", "how fast", "timeline"])) return add("a", tp.time[L], "menu");
    if (has(s, ["shop", "prodavnic", "proizvod", "e-commerce", "ecommerce", "store", "products", "prodaj"])) return add("a", tp.shop[L], "menu");
    for (var f = 0; f < KB.faq.length; f++) {
      var it = KB.faq[f]; if (it.id === "cost" || it.id === "time") continue;
      if (has(s, it.k)) return add("a", it[L], "menu");
    }
    if (has(s, ["primer", "portfolio", "radov", "example", "your work", "samples"])) return add("a", tp.examples[L], "menu");
    if (has(s, ["cen", "kost", "price", "cost", "eur", "€", "paket", "package", "how much", "koliko"]) && (siteWord(s) || onlyPriceWords(s))) return add("a", tp.prices[L], "menu");
    if (has(s, ["kontakt", "telefon", "whatsapp", "email", "e-mail", "mail", "instagram", "contact", " phone", "pozov", " call"]) && !/(koliko|kost|price|cost|how much)/.test(s)) return add("a", tp.contact[L], "lead");
    if (has(s, ["hvala", "thanks", "thank you", "hvala vam"])) return add("a", t("thanks"), "menu");
    if (/^ (zdravo|cao|pozdrav|dobar dan|hej|hi|hello|hey|zdravo!)[ !.?]*$/.test(s)) return add("a", t("hello"), "start");
    if (has(s, ["sajt", "site", "web", "stranic", "dizajn", "design", "hosting", "domen", "seo", "booking", "rezervac", "avella", "mihajl"])) return add("a", tp.unknown[L], "lead");
    return add("a", tp.offtopic[L], "menu");
  }

  function siteWord(s) { return has(s, ["sajt", "site", "web", "shop", "paket", "package", "izrad", "odrzavan", "stranic", "prodavnic", "avella", "maintenance"]); }
  function onlyPriceWords(s) {
    var stop = /^(koliko|kosta|kostaju|kostate|je|su|cena|cene|cenu|cijena|sta|vas|vam|vase|i|a|li|da|price|prices|pricing|how|much|does|do|it|cost|costs|the|what|are|your|is|eur|€|molim|pozdrav|zdravo)$/;
    return s.replace(/[?!.,:;()]/g, " ").trim().split(/\s+/).every(function (w) { return stop.test(w); });
  }

  function pkInfo(p) {
    var L = lang();
    add("a", fill(t("pkInfo"), { n: p.n, p: L === "en" ? p.p.replace(".", ",") : p.p, m: p.m, f: p.for[L], it: p.it[L].slice(0, 4).join(", ") }), "picked");
    S.st.pkg = p.n; save();
  }

  function startRec() {
    withKB(function () {
      S.st.rec = {}; save();
      add("a", KB.recommend.q1[lang()], "rec1");
    });
  }
  function answerRec(v, label, already) {
    if (!already) add("u", label);
    var L = lang(), R = KB.recommend, st = S.st.rec || (S.st.rec = {});
    // korak prepoznajemo po poslednjem pitanju asistenta
    var step = "";
    for (var i = S.msgs.length - 1; i >= 0; i--) if (S.msgs[i].r === "a") { step = S.msgs[i].k; break; }
    if (step === "rec1") {
      st.biz = v;
      var bl = R.q1.opts.filter(function (o) { return o.v === v; })[0];
      S.st.biz = bl ? bl.sr : v; save();
      if (v === "shop") return add("a", R.q3shop[L], "rec3shop");
      return add("a", R.q2site[L], "rec2");
    }
    if (step === "rec2") {
      st.need = v; save();
      if (v === "sell") return add("a", R.q3shop[L], "rec3shop");
      if (v === "pay") return pick("pay_more");
      return add("a", R.q3site[L], "rec3site");
    }
    if (step === "rec3site") return pick((st.need || "none") + "_" + v);
    if (step === "rec3shop") return pick("shop_" + v);
    add("a", KB.topics.unknown[L], "menu");
  }
  function pick(rule) {
    var L = lang(), name = KB.recommend.rules[rule];
    if (!name || name === "ask") { add("a", t("recAsk"), "lead"); return; }
    var p = KB.packages.site.concat(KB.packages.shop).filter(function (x) { return x.n === name; })[0];
    S.st.pkg = p.n; save();
    add("a", fill(t("recPick"), { n: p.n, p: L === "en" ? p.p.replace(".", ",") : p.p, m: p.m, f: p.for[L] }), "picked");
  }

  /* ---------------- upit (lead) ---------------- */
  function showLead(fromAI) {
    if (S.st.lead === "sent") { add("a", t("sent"), "sent"); return; }
    if (!fromAI) add("a", t("leadAsk"), "lead");
    S.st.lead = "form"; save();
    renderTail(); scrollEnd();
    setTimeout(function () { var n = log.querySelector(".avc-form input[name=name]"); if (n && !MOBILE.matches) n.focus({ preventScroll: true }); }, 50);
  }

  var formDraft = { name: "", tel: "", email: "" };
  function leadForm() {
    var f = document.createElement("form");
    f.className = "avc-form"; f.noValidate = true;
    f.setAttribute("aria-label", t("f_send"));
    f.innerHTML =
      '<label>' + esc(t("f_name")) + '<input name="name" type="text" autocomplete="name" autocapitalize="words" maxlength="80" required aria-describedby="avc-ferr"></label>' +
      '<label>' + esc(t("f_tel")) + '<input name="tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" required aria-describedby="avc-ferr" placeholder="+382 …"></label>' +
      '<label>' + esc(t("f_mail")) + '<input name="email" type="email" inputmode="email" autocomplete="email" maxlength="120" aria-describedby="avc-ferr"></label>' +
      '<input class="avc-hp" type="checkbox" name="botcheck" tabindex="-1" aria-hidden="true">' +
      '<p class="avc-ferr" id="avc-ferr" role="alert"></p>' +
      '<p class="avc-fprv">' + esc(t("f_prv")) + '<a href="' + BASE + 'politika-privatnosti.html" target="_blank" rel="noopener">' + esc(t("f_prvL")) + "</a></p>" +
      '<div class="avc-frow"><button type="submit" class="avc-btn">' + esc(t("f_send")) + '</button><button type="button" class="avc-link">' + esc(t("f_later")) + "</button></div>";
    ["name", "tel", "email"].forEach(function (k) {
      var i = f.elements[k]; i.value = formDraft[k];
      i.addEventListener("input", function () { formDraft[k] = i.value; if (i.hasAttribute("aria-invalid")) { i.removeAttribute("aria-invalid"); f.querySelector(".avc-ferr").textContent = ""; } });
    });
    f.querySelector(".avc-link").addEventListener("click", function () { S.st.lead = ""; save(); renderTail(); input.focus({ preventScroll: true }); });
    f.addEventListener("submit", function (e) { e.preventDefault(); submitLead(f); });
    return f;
  }

  function submitLead(f) {
    var E = f.elements, err = f.querySelector(".avc-ferr");
    var name = E.name.value.trim(), tel = E.tel.value.trim(), mail = E.email.value.trim();
    var digits = tel.replace(/\D/g, "");
    [E.name, E.tel, E.email].forEach(function (i) { i.removeAttribute("aria-invalid"); });
    var bad = null;
    if (name.length < 2) bad = [E.name, t("e_name")];
    else if (!/^[+\d\s()\/.-]+$/.test(tel) || digits.length < 8 || digits.length > 15) bad = [E.tel, t("e_tel")];
    else if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) bad = [E.email, t("e_mail")];
    if (bad) { bad[0].setAttribute("aria-invalid", "true"); err.textContent = bad[1]; bad[0].focus(); return; }
    err.textContent = "";
    if (!navigator.onLine) { err.textContent = t("offline"); return; }
    var btn = f.querySelector(".avc-btn");
    btn.disabled = true; btn.textContent = t("f_sending");

    var convo = S.msgs.filter(function (m) { return !m.err; }).slice(-12).map(function (m) {
      return (m.r === "u" ? "Posetilac: " : "Chat: ") + m.t.replace(/\s+/g, " ").slice(0, 300);
    }).join("\n");
    var payload = {
      access_key: ACCESS_KEY, subject: "Upit iz chata – Avella", from_name: "Avella chat",
      botcheck: E.botcheck.checked ? "1" : "",
      "Ime": name, "Telefon / WhatsApp": tel, "Email": mail || "—",
      "Vrsta biznisa": S.st.biz || "—", "Preporučeni paket": S.st.pkg || "—",
      "Jezik": lang().toUpperCase(), "Stranica": location.pathname,
      "Režim": aiOn() ? "AI" : "Rezervni (dugmići)", "Sažetak razgovora": convo || "—"
    };
    if (mail) payload.replyto = mail;
    fetch("https://api.web3forms.com/submit", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw 0; }); })
      .then(function () {
        S.st.lead = "sent"; formDraft = { name: "", tel: "", email: "" }; save();
        track("chat_lead", { package: S.st.pkg || "", mode: aiOn() ? "ai" : "fallback" });
        add("a", t("sent"), "sent");
      })
      .catch(function () {
        S.st.lead = ""; save();
        add("a", t("sendFail"), "err", { err: 1 });
      });
  }

  /* ---------------- prikaz teksta: escape + klikabilni linkovi ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function rich(text) {
    var L = lang();
    var re = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»“”])|((?:^|[^\w\/.])(uporedi|kontakt|politika-privatnosti)\.html)|([\w.+-]+@[\w-]+\.[\w.-]+\w)|(\+382[\d ]{7,13}\d)|(@avella\.agency)/g;
    var out = "", i = 0, m;
    while ((m = re.exec(text))) {
      var start = m.index, whole = m[0], pre = "";
      if (m[2]) { pre = whole.slice(0, whole.length - m[3].length - 5); start += pre.length; whole = whole.slice(pre.length); }
      out += esc(text.slice(i, start));
      var href, label = whole, ext = false;
      if (m[1]) {
        href = whole;
        var local = whole.match(/^https?:\/\/(?:www\.)?avellagency\.online\/(.*)$/i);
        if (local) { href = BASE + local[1]; label = pageLabel(local[1]) || whole.replace(/^https?:\/\//, ""); }
        else { ext = true; label = whole.replace(/^https?:\/\/(www\.)?/, "").replace(/\/(index\.html)?$/, ""); }
      } else if (m[2]) { href = BASE + whole; label = pageLabel(whole); }
      else if (m[4]) href = "mailto:" + whole;
      else if (m[5]) href = "tel:" + whole.replace(/\s/g, "");
      else if (m[6]) { href = "https://instagram.com/avella.agency"; ext = true; }
      out += '<a href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(label) + "</a>";
      i = m.index + m[0].length;
    }
    return out + esc(text.slice(i));
    function pageLabel(p) {
      p = p.replace(/[?#].*$/, "");
      var map = { "uporedi.html": ["uporedi pakete", "compare packages"], "kontakt.html": ["forma za ponudu", "quote form"], "politika-privatnosti.html": ["politika privatnosti", "privacy policy"], "": ["avellagency.online", "avellagency.online"] };
      return map[p] ? map[p][L === "en" ? 1 : 0] : "";
    }
  }

  function scrollEnd(instant) {
    if (!log) return;
    requestAnimationFrame(function () { log.scrollTo({ top: log.scrollHeight, behavior: instant || RM.matches ? "auto" : "smooth" }); });
  }

  /* ---------------- telefon: povlačenje sheet-a na dole ---------------- */
  function initSheet() {
    var startY = 0, lastY = 0, lastT = 0, vel = 0, dy = 0, dragging = false, h = 0, pid = null;
    var zones = [root.querySelector(".avc-handle"), root.querySelector(".avc-head")];
    zones.forEach(function (z) { z.addEventListener("pointerdown", down); });
    function down(e) {
      if (!MOBILE.matches || RM.matches || e.button > 0 || e.target.closest("button,a")) return;
      dragging = true; pid = e.pointerId; startY = lastY = e.clientY; lastT = e.timeStamp; vel = 0; dy = 0;
      h = panel.getBoundingClientRect().height;
      root.classList.add("is-dragging");
      try { e.currentTarget.setPointerCapture(pid); } catch (x) {}
      e.currentTarget.addEventListener("pointermove", move);
      e.currentTarget.addEventListener("pointerup", up);
      e.currentTarget.addEventListener("pointercancel", up);
    }
    function move(e) {
      if (!dragging || e.pointerId !== pid) return;
      var raw = e.clientY - startY;
      dy = raw >= 0 ? raw : -Math.pow(-raw, 0.7); // rubber-band na gore
      var dt = e.timeStamp - lastT;
      if (dt > 0) vel = 0.8 * ((e.clientY - lastY) / dt) + 0.2 * vel;
      lastY = e.clientY; lastT = e.timeStamp;
      panel.style.transform = "translateY(" + dy + "px)";
    }
    function up(e) {
      if (!dragging) return;
      dragging = false;
      e.currentTarget.removeEventListener("pointermove", move);
      e.currentTarget.removeEventListener("pointerup", up);
      e.currentTarget.removeEventListener("pointercancel", up);
      root.classList.remove("is-dragging");
      if (e.timeStamp - lastT > 100) vel = 0; // prst je stao pre puštanja – nema zamaha
      if (dy > h * 0.25 || (vel > 0.11 && dy > 10)) { closeChat(); }
      else panel.style.transform = "";
    }
  }

  /* ---------------- telefon: tastatura (visualViewport) ---------------- */
  function initViewport() {
    var vv = window.visualViewport; if (!vv) return;
    var raf = 0;
    function upd() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        if (!MOBILE.matches) { root.style.removeProperty("--avc-kb"); root.style.removeProperty("--avc-vh"); root.classList.remove("kb-open"); return; }
        var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty("--avc-kb", kb + "px");
        root.style.setProperty("--avc-vh", vv.height + "px");
        root.classList.toggle("kb-open", kb > 80);
        if (kb > 80) scrollEnd(true);
      });
    }
    vv.addEventListener("resize", upd);
    vv.addEventListener("scroll", upd);
    upd();
  }
})();
