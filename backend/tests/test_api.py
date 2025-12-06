import os
import sys

# Ajouter le dossier parent (backend/) au PYTHONPATH
CURRENT_DIR = os.path.dirname(__file__)
PARENT_DIR = os.path.dirname(CURRENT_DIR)
sys.path.append(PARENT_DIR)

from app import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_create_and_list_tasks():
    # Création d'une tâche
    response = client.post("/tasks", json={"title": "Test task"})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test task"
    task_id = data["id"]

    # Liste des tâches
    response = client.get("/tasks")
    assert response.status_code == 200
    tasks = response.json()
    assert any(t["id"] == task_id for t in tasks)
