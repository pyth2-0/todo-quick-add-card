/*! todo-quick-add-card — Texteingabe + aufklappbare Liste für jede Home-Assistant-Todo-Entität */
const TQA_VERSION = "1.2.1";

class TodoQuickAddCard extends HTMLElement {
  static getStubConfig(hass) {
    const e = Object.keys(hass.states).find((k) => k.startsWith("todo."));
    return { entity: e || "todo.shopping_list" };
  }

  setConfig(config) {
    if (!config || !config.entity || !config.entity.startsWith("todo.")) {
      throw new Error("`entity` muss eine todo.*-Entität sein");
    }
    this._config = {
      title: "",
      placeholder: "Artikel hinzufügen …",
      icon: "mdi:cart-plus",
      send_icon: "mdi:send",
      collapsible: true,
      start_open: false,
      allow_check: false,
      show_completed: false,
      max_items: 0,
      show_input: true,
      show_header: true,
      show_description: false,
      accent: "",
      background: "",
      border_color: "",
      text_color: "",
      muted_color: "",
      radius: "",
      ...config,
    };
    this._items = [];
    this._sig = null;
    this._busy = false;
    this._open = this._loadOpen();
    if (!this._root) this._build();
    this._applyConfig();
    this._renderList();
  }

  set hass(hass) {
    this._hass = hass;
    const st = hass.states[this._config.entity];
    const sig = st ? `${st.state}|${st.last_updated}` : "missing";
    if (sig !== this._sig) {
      this._sig = sig;
      this._refresh();
    }
  }

  getCardSize() { return this._open ? 4 : 2; }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }

  // ---------------------------------------------------------------- Aufbau
  _build() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.innerHTML = `
      <style>
        :host { display: block; --tqa-accent: #F0B445; }
        :host { --tqa-bg: var(--ha-card-background, var(--card-background-color, #141A22)); --tqa-border: var(--divider-color, #2A3441); --tqa-ink: var(--primary-text-color, #F0F4F8); --tqa-muted: var(--secondary-text-color, #B0BBC6); --tqa-shadow: var(--ha-card-box-shadow, none); --tqa-radius: 20px; }
        .wrap { display: flex; flex-direction: column; gap: 10px; }
        .surface { background: var(--tqa-bg); border: 1px solid var(--tqa-border); box-shadow: var(--tqa-shadow); color: var(--tqa-ink); }
        .pill { display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 6px 0 16px;
                border-radius: 999px; box-sizing: border-box; transition: border-color .2s; }
        .pill:focus-within { border-color: var(--tqa-accent); }
        .pill > ha-icon { color: var(--tqa-accent); --mdc-icon-size: 22px; flex: none; }
        input { flex: 1; min-width: 0; background: none; border: none; outline: none; padding: 0;
                color: var(--tqa-ink); font: inherit; font-size: 16px; }
        input::placeholder { color: var(--tqa-muted); opacity: .8; }
        .send { flex: none; width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
                display: grid; place-items: center; background: var(--tqa-accent); color: #2A1A00;
                box-shadow: 0 0 0 3px color-mix(in srgb, var(--tqa-accent) 22%, transparent),
                            0 0 14px 1px color-mix(in srgb, var(--tqa-accent) 22%, transparent); }
        .send:disabled { opacity: .55; cursor: default; }
        .send ha-icon { --mdc-icon-size: 22px; }
        .spin { animation: tqa-spin 1s linear infinite; }
        @keyframes tqa-spin { to { transform: rotate(360deg); } }
        .group { border-radius: var(--tqa-radius); overflow: hidden; }
        .head { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: none; background: none; color: inherit;
                cursor: pointer; font: inherit; text-align: left; width: 100%; box-sizing: border-box; }
        .head .chev { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; flex: none;
                      background: color-mix(in srgb, var(--tqa-accent) 16%, transparent); color: var(--tqa-accent); }
        .head .t { font-weight: 600; font-size: 15px; }
        .head .s { font-size: 12.5px; color: var(--tqa-muted); }
        .head.static { cursor: default; }
        .list { padding: 0 14px; }
        .head:not([hidden]) + .list { border-top: 1px solid var(--tqa-border); }
        .row { display: flex; align-items: center; gap: 12px; min-height: 44px; font-size: 14.5px; }
        .row + .row { border-top: 1px solid var(--tqa-border); }
        .row ha-icon { --mdc-icon-size: 20px; color: var(--tqa-muted); flex: none; }
        .row.pending { opacity: .6; }
        .row.done .txt { text-decoration: line-through; opacity: .6; }
        .row.done ha-icon { color: var(--tqa-accent); }
        .row .sub { font-size: 12.5px; color: var(--tqa-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .row .main { padding: 8px 0; min-width: 0; flex: 1; }
        .row.check { cursor: pointer; }
        .empty { padding: 14px 0; color: var(--tqa-muted); font-size: 14px; }
        .err { color: var(--error-color, #FF8F6E); font-size: 13px; padding: 0 16px; }
        [hidden] { display: none !important; }
      </style>
      <div class="wrap">
        <div class="pill surface">
          <ha-icon id="icon"></ha-icon>
          <input id="inp" type="text" enterkeyhint="send" autocomplete="off" autocapitalize="sentences" />
          <button class="send" id="send" aria-label="Hinzufügen"><ha-icon id="sendicon"></ha-icon></button>
        </div>
        <div class="err" id="err" hidden></div>
        <div class="group surface" id="group" hidden>
          <button class="head" id="head" hidden>
            <span class="chev"><ha-icon id="chev"></ha-icon></span>
            <span><div class="t" id="title"></div><div class="s" id="count"></div></span>
          </button>
          <div class="list" id="list" hidden></div>
        </div>
      </div>`;
    const $ = (id) => this._root.getElementById(id);
    this._inp = $("inp"); this._sendBtn = $("send"); this._sendIcon = $("sendicon");
    this._listEl = $("list"); this._head = $("head"); this._group = $("group"); this._err = $("err");
    this._inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); this._send(); } });
    // pointerdown + preventDefault: Eingabefeld behält den Fokus (Tastatur bleibt offen)
    this._sendBtn.addEventListener("pointerdown", (e) => e.preventDefault());
    this._sendBtn.addEventListener("click", () => this._send());
    this._head.addEventListener("click", () => { if (this._config.collapsible) this._toggle(); });
  }

  _applyConfig() {
    const c = this._config, $ = (id) => this._root.getElementById(id);
    this.style.setProperty("--tqa-accent", c.accent || "#F0B445");
    const set = (k, v) => (v ? this.style.setProperty(k, v) : this.style.removeProperty(k));
    set("--tqa-bg", c.background); set("--tqa-border", c.border_color); set("--tqa-ink", c.text_color);
    set("--tqa-muted", c.muted_color); set("--tqa-radius", c.radius);
    this._root.querySelector(".pill").hidden = !c.show_input;
    this._head.classList.toggle("static", !c.collapsible);
    this._root.getElementById("chev").parentElement.hidden = !c.collapsible;
    $("icon").setAttribute("icon", c.icon);
    this._sendIcon.setAttribute("icon", c.send_icon);
    this._inp.placeholder = c.placeholder;
    $("title").textContent = c.title || "Liste";
    this._head.hidden = !(c.collapsible || c.show_header);
  }

  // ---------------------------------------------------------------- Zustand
  _key() { return `tqa-open-${this._config.entity}`; }
  _loadOpen() {
    if (!this._config.collapsible) return true;
    try { const v = localStorage.getItem(this._key()); if (v !== null) return v === "1"; } catch (e) { /* ignore */ }
    return !!this._config.start_open;
  }
  _toggle() {
    this._open = !this._open;
    try { localStorage.setItem(this._key(), this._open ? "1" : "0"); } catch (e) { /* ignore */ }
    this._renderList();
  }

  async _refresh() {
    if (!this._hass || this._refreshing) { this._again = true; return; }
    this._refreshing = true;
    try {
      const res = await this._hass.callWS({ type: "todo/item/list", entity_id: this._config.entity });
      const keep = this._items.filter((i) => i.pending);
      this._items = (res.items || []).concat(keep.filter((p) => !(res.items || []).some((i) => i.summary === p.summary)));
      this._renderList();
    } catch (e) { /* Liste bleibt, wie sie ist */ }
    this._refreshing = false;
    if (this._again) { this._again = false; this._refresh(); }
  }

  async _send() {
    const text = this._inp.value.trim();
    if (!text || this._busy) return;
    this._inp.value = "";
    this._showError("");
    const tmp = { uid: `tmp-${Date.now()}`, summary: text, status: "needs_action", pending: true };
    this._items = this._items.concat(tmp);
    this._renderList();
    this._setBusy(true);
    try {
      await this._hass.callService("todo", "add_item", { item: text }, { entity_id: this._config.entity });
      this.dispatchEvent(new CustomEvent("haptic", { detail: "success", bubbles: true, composed: true }));
      tmp.pending = false;
    } catch (e) {
      this._items = this._items.filter((i) => i !== tmp);
      this._inp.value = text;
      this._showError(`Konnte nicht hinzufügen: ${e && e.message ? e.message : e}`);
    }
    this._setBusy(false);
    this._renderList();
    this._refresh();
  }

  async _check(item) {
    const status = item.status === "completed" ? "needs_action" : "completed";
    item.status = status; this._renderList();
    try {
      await this._hass.callService("todo", "update_item", { item: item.uid, status }, { entity_id: this._config.entity });
    } catch (e) { this._showError(`Konnte nicht ändern: ${e && e.message ? e.message : e}`); }
    this._refresh();
  }

  _setBusy(b) {
    this._busy = b;
    this._sendBtn.disabled = b;
    this._sendIcon.setAttribute("icon", b ? "mdi:loading" : this._config.send_icon);
    this._sendIcon.classList.toggle("spin", b);
  }

  _showError(msg) { this._err.textContent = msg; this._err.hidden = !msg; }

  // ---------------------------------------------------------------- Anzeige
  _renderList() {
    if (!this._root) return;
    const c = this._config;
    const open = this._items.filter((i) => i.status !== "completed");
    let shown = c.show_completed ? this._items : open;
    if (c.max_items > 0) shown = shown.slice(0, c.max_items);
    const $ = (id) => this._root.getElementById(id);
    $("count").textContent = open.length === 1 ? "1 offener Eintrag" : `${open.length} offene Einträge`;
    $("chev").setAttribute("icon", this._open ? "mdi:chevron-up" : "mdi:chevron-down");
    const visible = !c.collapsible || this._open;
    this._listEl.hidden = !visible;
    this._group.hidden = this._head.hidden && !visible;
    if (!visible) return;
    this._listEl.textContent = "";
    if (!shown.length) {
      const d = document.createElement("div"); d.className = "empty"; d.textContent = "Keine offenen Einträge";
      this._listEl.appendChild(d); return;
    }
    for (const it of shown) {
      const row = document.createElement("div");
      row.className = "row" + (it.pending ? " pending" : "") + (it.status === "completed" ? " done" : "") + (c.allow_check ? " check" : "");
      const ic = document.createElement("ha-icon");
      ic.setAttribute("icon", c.allow_check
        ? (it.status === "completed" ? "mdi:checkbox-marked-outline" : "mdi:checkbox-blank-outline")
        : (it.pending ? "mdi:loading" : "mdi:circle-small"));
      if (it.pending) ic.classList.add("spin");
      const main = document.createElement("div"); main.className = "main";
      const t = document.createElement("div"); t.className = "txt"; t.textContent = it.summary; main.appendChild(t);
      if (c.show_description && it.description) { const d = document.createElement("div"); d.className = "sub"; d.textContent = it.description; main.appendChild(d); }
      row.append(ic, main);
      if (c.allow_check && !it.pending) row.addEventListener("click", () => this._check(it));
      this._listEl.appendChild(row);
    }
  }
}

if (!customElements.get("todo-quick-add-card")) customElements.define("todo-quick-add-card", TodoQuickAddCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "todo-quick-add-card",
  name: "Todo Quick Add",
  description: "Einzeilige Eingabe mit Senden-Button und aufklappbarer Liste für jede Todo-Entität",
  preview: false,
});
console.info(`%c TODO-QUICK-ADD-CARD %c v${TQA_VERSION} `, "background:#F0B445;color:#2A1A00;font-weight:700", "background:#2A3441;color:#fff");
