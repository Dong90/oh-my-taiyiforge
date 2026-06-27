"""User Repository."""
from app.repositories.base import BaseRepository
from app.models.db_models import User

class UserRepository(BaseRepository[User]):
    model = User
