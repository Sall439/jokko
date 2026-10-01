from django.db.models import QuerySet

from apps.accounts.models import User


def get_user_list() -> QuerySet[User]:
    return User.objects.all().order_by("-date_joined")
