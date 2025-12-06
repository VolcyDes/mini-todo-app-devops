const API_BASE = "http://127.0.0.1:8000";

const tasksList = document.getElementById("tasks-list");
const input = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");

async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) {
      console.error("Erreur lors du chargement des tâches", res.status);
      return;
    }
    const tasks = await res.json();
    tasksList.innerHTML = "";
    tasks.forEach(addTaskToDOM);
  } catch (err) {
    console.error("Erreur réseau:", err);
  }
}

function addTaskToDOM(task) {
  const li = document.createElement("li");
  li.textContent = task.title + " ";

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.onclick = () => deleteTask(task.id);

  li.appendChild(delBtn);
  tasksList.appendChild(li);
}

async function createTask(title) {
  if (!title.trim()) return;
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      console.error("Erreur lors de la création de la tâche", res.status);
      return;
    }
    const task = await res.json();
    addTaskToDOM(task);
    input.value = "";
  } catch (err) {
    console.error("Erreur réseau:", err);
  }
}

async function deleteTask(id) {
  try {
    await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  } catch (err) {
    console.error("Erreur réseau:", err);
  }
}

addBtn.addEventListener("click", () => createTask(input.value));
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createTask(input.value);
});

loadTasks();
