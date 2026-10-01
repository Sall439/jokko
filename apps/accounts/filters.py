import django_filters
from django.db.models import Q

from apps.accounts.models import User


class UserFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    role = django_filters.CharFilter(field_name="role", lookup_expr="exact")

    class Meta:
        model = User
        fields = ["role"]

    def filter_search(self, queryset, name, value):  # type: ignore[no-untyped-def]
        if not value:
            return queryset
        return queryset.filter(
            Q(email__icontains=value)
            | Q(nom__icontains=value)
            | Q(prenom__icontains=value)
            | Q(telephone__icontains=value)
        )
