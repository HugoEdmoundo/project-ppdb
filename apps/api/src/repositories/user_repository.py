import uuid
from typing import cast

from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.models.auth import Page, User, UserPagePermission


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_users_paginated(
        self, search: str, page: int, per_page: int
    ) -> tuple[list[User], int]:
        query = self.db.query(User).filter(
            or_(User.user_type.is_(None), User.user_type != "applicant")
        )

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                )
            )

        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return users, total

    def get_by_id(self, user_id: str) -> User | None:
        return cast(User | None, self.db.query(User).filter(User.id == user_id).first())

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()

    def get_page_permissions(self, user_id: str) -> list[str]:
        perms = (
            self.db.query(UserPagePermission)
            .filter(UserPagePermission.user_id == user_id)
            .all()
        )
        return [p.page_id for p in perms]

    def get_page_keys(self, user_id: str) -> list[str]:
        rows = (
            self.db.query(Page.key)
            .join(UserPagePermission, UserPagePermission.page_id == Page.id)
            .filter(UserPagePermission.user_id == user_id)
            .all()
        )
        return [r[0] for r in rows]

    def set_page_permissions(self, user_id: str, page_ids: list[str]) -> None:
        # Delete existing
        self.db.query(UserPagePermission).filter(
            UserPagePermission.user_id == user_id
        ).delete()

        from datetime import datetime
        from zoneinfo import ZoneInfo

        now = datetime.now(ZoneInfo("Asia/Jakarta"))

        # Insert new
        new_perms = []
        for page_id in page_ids:
            new_perms.append(
                UserPagePermission(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    page_id=page_id,
                    created_at=now,
                )
            )

        if new_perms:
            self.db.add_all(new_perms)

        self.db.commit()
