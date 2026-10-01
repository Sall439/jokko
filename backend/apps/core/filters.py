"""FilterSets de base (django-filter n'embarque pas de stubs : `Any`)."""

from typing import Any

import django_filters
from django.db.models import Q, QuerySet


class BaseFilterSet(django_filters.FilterSet):
    """Apporte une recherche plein texte (`?search=`) et un tri (`?ordering=`).

    Les sous-classes déclarent ``search_fields`` et les champs de tri.
    """

    search = django_filters.CharFilter(method="filter_search")
    ordering = django_filters.OrderingFilter()

    #: Champs parcourus par `?search=` (recherche `icontains`).
    search_fields: tuple[str, ...] = ()

    def filter_search(
        self, queryset: QuerySet[Any], name: str, value: str
    ) -> QuerySet[Any]:
        if not value:
            return queryset
        criteria = Q()
        for field in self.search_fields:
            criteria |= Q(**{f"{field}__icontains": value})
        return queryset.filter(criteria)
