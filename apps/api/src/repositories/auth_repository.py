from typing import cast

from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.models.auth import RefreshToken, Role, User, UserPagePermission
from src.models.ppdb import PPDBApplicant


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_username_or_email(self, identifier: str) -> User | None:
        return cast(
            User | None,
            self.db.query(User)
            .filter(or_(User.username == identifier, User.email == identifier))
            .first(),
        )

    def get_user_by_id(self, user_id: str) -> User | None:
        return cast(User | None, self.db.query(User).filter(User.id == user_id).first())

    def get_role_by_id(self, role_id: str) -> Role | None:
        return cast(Role | None, self.db.query(Role).filter(Role.id == role_id).first())

    def get_page_permissions(self, user_id: str) -> list[str]:
        from src.models.auth import Page

        pages = (
            self.db.query(Page.key)
            .join(UserPagePermission, UserPagePermission.page_id == Page.id)
            .filter(UserPagePermission.user_id == user_id)
            .all()
        )
        return [p[0] for p in pages]

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.user_id == user_id)
            .first(),
        )

    def update_user(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def get_refresh_token(self, token_hash: str) -> RefreshToken | None:
        return cast(
            RefreshToken | None,
            self.db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hash)
            .first(),
        )

    def update_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self.db.commit()
        self.db.refresh(token)
        return token
