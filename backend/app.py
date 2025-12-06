from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

from db import Base, engine, get_db
from models import Task
from schemas import TaskCreate, TaskRead

# Création des tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mini To-Do API")

# CORS (autorise toutes les origines en dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # en prod tu pourras restreindre
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/tasks", response_model=List[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

@app.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(title=task_in.title)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return
