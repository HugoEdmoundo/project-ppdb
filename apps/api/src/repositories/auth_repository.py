from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.models.auth import RefreshToken, Role, User, UserPagePermission
from src.models.ppdb import PPDBApplicant


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_username_or_email(self, identifier: str) -> User | None:
        return (
            self.db.query(User)
            .filter(or_(User.username == identifier, User.email == identifier))
            .first()
        )

    def get_user_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_role_by_id(self, role_id: str) -> Role | None:
        return self.db.query(Role).filter(Role.id == role_id).first()

    def get_page_permissions(self, user_id: str) -> list[str]:
        (
            self.db.query(UserPagePermission)
            .filter(UserPagePermission.user_id == user_id)
            .all()
        )
        # To match the exact legacy behavior where it joins pages:
        # SELECT p.`key` FROM user_page_permissions up
        #   JOIN pages p ON up.page_id = p.id WHERE up.user_id = :user_id
        # We can just return the keys. But wait, `page_id` is the id of the page.
        # The previous code joined pages table to get `key`.
        # Assuming `page_id` is the `id` of the page, we need the `Page` model.
        from src.models.auth import Page

        pages = (
            self.db.query(Page.key)
            .join(UserPagePermission, UserPagePermission.page_id == Page.id)
            .filter(UserPagePermission.user_id == user_id)
            .all()
        )
        return [p[0] for p in pages]

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        return (
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.user_id == user_id)
            .first()
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
        return (
            self.db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hash)
            .first()
        )

    def update_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self.db.commit()
        self.db.refresh(token)
        return token
