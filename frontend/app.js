/**
 * Dashboard + To-Do (vanilla JS)
 * Backend attendu:
 *  - GET    /tasks        -> [{id, title}, ...]
 *  - POST   /tasks        -> body: {title: "..."}
 *  - DELETE /tasks/{id}
 */

let API_BASE = localStorage.getItem("API_BASE") || "http://127.0.0.1:8000";

const els = {
  list: document.getElementById("taskList"),
  input: document.getElementById("taskInput"),
  addBtn: document.getElementById("addBtn"),
  refreshBtn: document.getElementById("refreshBtn"),

  counter: document.getElementById("counter"),

  apiBase: document.getElementById("apiBase"),
  apiStatus: document.getElementById("apiStatus"),
  apiStatusText: document.getElementById("apiStatusText"),
  openDocsBtn: document.getElementById("openDocsBtn"),

  // Metrics
  mCount: document.getElementById("mCount"),
  mLatency: document.getElementById("mLatency"),
  mEnv: document.getElementById("mEnv"),
  mLast: document.getElementById("mLast"),

  // Actions
  resetBtn: document.getElementById("resetBtn"),
  switchBtn: document.getElementById("switchBtn"),
};

function detectEnv(apiBase) {
  // Heuristique simple (suffisant pour soutenance)
  if (apiBase.includes("localhost") || apiBase.includes("127.0.0.1")) {
    // Peut être local python, docker, ou tunnel minikube → on affine:
    const portMatch = apiBase.match(/:(\d+)/);
    const port = portMatch ? parseInt(portMatch[1], 10) : null;
    if (port === 8000) return "Local/Docker";
    return "Minikube (tunnel)";
  }
  return "Remote";
}

function setApiStatus(ok) {
  if (ok) {
    els.apiStatus.classList.remove("off");
    els.apiStatusText.textContent = "OK";
  } else {
    els.apiStatus.classList.add("off");
    els.apiStatusText.textContent = "DOWN";
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[m]));
}

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  // Si erreur HTTP, essaye de lire un message (si possible)
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const txt = await res.text();
      if (txt) msg = txt;
    } catch {}
    throw new Error(msg);
  }

  // ✅ DELETE FastAPI renvoie souvent 204 No Content => pas de JSON à parser
  if (res.status === 204) return null;

  const ct = res.headers.get("content-type") || "";
  // Si pas du JSON, retourne du texte
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    return txt || null;
  }

  // Si JSON vide, éviter crash
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}


function updateHeaderCount(n) {
  els.counter.textContent = n <= 1 ? `${n} tâche` : `${n} tâches`;
  els.mCount.textContent = String(n);
}

function updateMeta(latencyMs, ok) {
  els.mLatency.textContent = ok ? String(latencyMs) : "—";
  els.mEnv.textContent = detectEnv(API_BASE);
  els.mLast.textContent = new Date().toLocaleTimeString();
  els.apiBase.textContent = `API_BASE = ${API_BASE}`;
}

function render(tasks) {
  els.list.innerHTML = "";
  const n = tasks.length;
  updateHeaderCount(n);

  if (n === 0) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item-left">
        <span class="dot" style="background:rgba(59,130,246,0.95); box-shadow:0 0 0 4px rgba(59,130,246,0.18)"></span>
        <div class="task-text" style="opacity:.9">Aucune tâche. Ajoute-en une 👇</div>
      </div>
      <div></div>
    `;
    els.list.appendChild(li);
    return;
  }

  for (const t of tasks) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item-left">
        <span class="dot"></span>
        <div class="task-text" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>
      </div>
      <button class="btn danger" data-id="${t.id}">Supprimer</button>
    `;
    els.list.appendChild(li);
  }

  els.list.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      btn.disabled = true;
      try {
        await api(`/tasks/${id}`, { method: "DELETE" });

	// 🔄 refresh immédiat
	await load();

	// 🔁 micro-refresh (au cas où le navigateur est en retard)
	setTimeout(load, 50);
      } catch (e) {
        alert("Erreur suppression: " + e.message);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function load() {
  const t0 = performance.now();
  try {
    const tasks = await api("/tasks");
    const latency = Math.round(performance.now() - t0);

    setApiStatus(true);
    updateMeta(latency, true);
    render(tasks);
  } catch (e) {
    console.error(e);
    setApiStatus(false);
    updateMeta(null, false);

    els.list.innerHTML = "";
    els.counter.textContent = "—";
    els.mCount.textContent = "—";

    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item-left">
        <span class="dot" style="background:rgba(239,68,68,0.95); box-shadow:0 0 0 4px rgba(239,68,68,0.18)"></span>
        <div class="task-text" style="opacity:.95">
          Impossible de joindre l’API.<br/>
          <span style="opacity:.75">Vérifie API_BASE (bouton “Changer API_BASE”).</span>
        </div>
      </div>
      <div></div>
    `;
    els.list.appendChild(li);
  }
}

async function addTask() {
  const title = (els.input.value || "").trim();
  if (!title) return;

  els.addBtn.disabled = true;
  try {
    await api("/tasks", { method: "POST", body: JSON.stringify({ title }) });
    els.input.value = "";
    await load();
  } catch (e) {
    alert("Erreur ajout: " + e.message);
  } finally {
    els.addBtn.disabled = false;
    els.input.focus();
  }
}

async function resetAll() {
  if (!confirm("Supprimer TOUTES les tâches ?")) return;

  els.resetBtn.disabled = true;
  try {
    const tasks = await api("/tasks");
    // supprime en série (simple & fiable)
    for (const t of tasks) {
      await api(`/tasks/${t.id}`, { method: "DELETE" });
    }
    await load();
  } catch (e) {
    alert("Erreur reset: " + e.message);
  } finally {
    els.resetBtn.disabled = false;
  }
}

function switchApiBase() {
  const current = API_BASE;
  const next = prompt(
    "Nouvelle URL API_BASE (ex: http://127.0.0.1:8000 ou URL minikube) :",
    current
  );
  if (!next) return;
  API_BASE = next.trim();
  localStorage.setItem("API_BASE", API_BASE);
  els.apiBase.textContent = `API_BASE = ${API_BASE}`;
  els.mEnv.textContent = detectEnv(API_BASE);
  load();
}

/* Events */
els.addBtn.addEventListener("click", addTask);
els.refreshBtn.addEventListener("click", load);
els.resetBtn.addEventListener("click", resetAll);
els.switchBtn.addEventListener("click", switchApiBase);

els.openDocsBtn.addEventListener("click", () => {
  window.open(`${API_BASE}/docs`, "_blank");
});

els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

/* Init */
els.apiBase.textContent = `API_BASE = ${API_BASE}`;
els.mEnv.textContent = detectEnv(API_BASE);
load();
