import logging
import random
import string
import uuid
from datetime import datetime
from typing import cast
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from src.core.config import settings
from src.core.events import user_hubs
from src.core.notif_service import send_notifications
from src.core.security import hash_password
from src.models.auth import Role, User
from src.repositories.user_repository import UserRepository

logger = logging.getLogger("ptdarrahman.users")


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository
        self.wib = ZoneInfo("Asia/Jakarta")

    def _generate_password(self, length: int = 8) -> str:
        chars = string.ascii_letters + string.digits
        return "".join(random.choice(chars) for _ in range(length))

    def _login_link_for(self, user_type: str) -> str:
        if user_type == "applicant":
            return settings.ppdb_frontend_url + "/auth/login"
        return settings.superadmin_frontend_url + "/auth/login"

    def _send_credentials(
        self, event_key: str, user: User, raw_password: str = ""
    ) -> None:
        try:
            send_notifications(
                [
                    (
                        event_key,
                        {
                            "username": user.username,
                            "email": user.email,
                            "phone": user.phone or "",
                            "password": raw_password,
                            "link_login": self._login_link_for(
                                user.user_type or "admin"
                            ),
                        },
                    )
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "phone": user.phone,
                },
            )
        except Exception:
            logger.exception("send credential notification failed")

    def get_users_paginated(self, search: str, page: int, per_page: int) -> dict:
        users, total = self.repository.get_users_paginated(search, page, per_page)

        # Convert to dict for legacy compatibility with existing frontend schema
        data = []
        for u in users:
            data.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "full_name": u.full_name,
                    "phone": u.phone,
                    "user_type": u.user_type,
                    "role_id": u.role_id,
                    "is_active": u.is_active,
                    "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S")
                    if u.created_at
                    else None,
                }
            )

        return {
            "data": data,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    def get_user(self, user_id: str) -> dict:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "user_type": user.user_type,
            "role_id": user.role_id,
            "is_active": user.is_active,
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if user.created_at
            else None,
        }

    def create_user(self, data: dict) -> dict:
        raw_password = data.get("password") or self._generate_password()
        generated = not data.get("password")

        now = datetime.now(self.wib)
        new_user = User(
            id=str(uuid.uuid4()),
            username=data["username"],
            password_hash=hash_password(raw_password),
            email=data.get("email", ""),
            phone=data.get("phone"),
            full_name=data.get("full_name", ""),
            role_id=data.get("role_id"),
            user_type=data.get("user_type", "admin"),
            is_active=True,
            created_at=now,
            updated_at=now,
        )

        try:
            created_user = self.repository.create(new_user)
        except IntegrityError:
            raise HTTPException(
                status_code=400, detail="Username or email already exists"
            )

        self._send_credentials("account_created", created_user, raw_password)

        response = {
            "id": created_user.id,
            "username": created_user.username,
            "email": created_user.email,
        }
        if generated:
            response["_generated_password"] = raw_password

        return response

    def update_user(self, user_id: str, data: dict) -> dict:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if data.get("username"):
            user.username = data["username"]
        if data.get("email") is not None:
            user.email = data["email"]
        if data.get("phone") is not None:
            user.phone = data["phone"]
        if data.get("full_name") is not None:
            user.full_name = data["full_name"]
        if data.get("password"):
            user.password_hash = hash_password(data["password"])
        if data.get("role_id"):
            user.role_id = data["role_id"]
        if data.get("user_type"):
            user.user_type = data["user_type"]
        if data.get("is_active") is not None:
            user.is_active = data["is_active"]

        user.updated_at = datetime.now(self.wib)

        try:
            updated_user = self.repository.update(user)
        except IntegrityError:
            raise HTTPException(
                status_code=400, detail="Username or email already exists"
            )

        if data.get("password"):
            self._send_credentials("password_reset", updated_user, data["password"])
        elif data.get("email") or data.get("phone"):
            self._send_credentials("account_updated", updated_user)

        return {
            "id": updated_user.id,
            "username": updated_user.username,
            "email": updated_user.email,
        }

    def delete_user(self, user_id: str, current_user_id: str | None = None) -> None:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if current_user_id and user_id == current_user_id:
            raise HTTPException(
                status_code=400, detail="Tidak bisa menghapus akun sendiri"
            )
        if self._is_superadmin_user(user) and self._count_superadmins() <= 1:
            raise HTTPException(
                status_code=400,
                detail="Tidak bisa menghapus superadmin terakhir",
            )
        try:
            self.repository.delete(user)
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete user; they are still referenced "
                "by other records",
            )

    def _is_superadmin_user(self, user) -> bool:
        if (user.user_type or "") == "superadmin":
            return True
        if user.role_id:
            role = (
                self.repository.db.query(Role).filter(Role.id == user.role_id).first()
            )
            return bool(role and role.is_superadmin)
        return False

    def _count_superadmins(self) -> int:
        from sqlalchemy import or_

        return cast(
            int,
            (
                self.repository.db.query(User)
                .filter(
                    or_(
                        User.user_type == "superadmin",
                        User.role_id.in_(
                            self.repository.db.query(Role.id).filter(
                                Role.is_superadmin.is_(True)
                            )
                        ),
                    )
                )
                .count()
            ),
        )

    def get_page_permissions(self, user_id: str) -> dict:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        page_ids = self.repository.get_page_permissions(user_id)
        return {"user_id": user_id, "page_ids": page_ids}

    def update_page_permissions(self, user_id: str, page_ids: list[str]) -> dict:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        self.repository.set_page_permissions(user_id, page_ids)
        page_keys = self.repository.get_page_keys(user_id)
        user_hubs.broadcast(
            user_id,
            {
                "type": "page_permissions_changed",
                "page_keys": page_keys,
            },
        )
        return {"user_id": user_id, "page_ids": page_ids}
