from pydantic import BaseModel

class TaskBase(BaseModel):
    title: str
    done: bool = False

class TaskCreate(BaseModel):
    title: str

class TaskRead(TaskBase):
    id: int

    class Config:
        orm_mode = True
