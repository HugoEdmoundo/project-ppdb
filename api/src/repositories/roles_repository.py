from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.models.auth import Role

class RolesRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[Role]:
        return self.db.query(Role).order_by(Role.name.asc()).all()

    def get_by_id(self, role_id: str) -> Optional[Role]:
        return self.db.query(Role).filter(Role.id == role_id).first()

    def create(self, role: Role) -> Role:
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update(self, role: Role) -> Role:
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete(self, role: Role) -> None:
        self.db.delete(role)
        self.db.commit()
