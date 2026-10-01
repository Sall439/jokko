from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 100

    def get_paginated_response(self, data: Any) -> Response:
        if self.page is None:
            return Response({"data": data, "meta": {}})
        return Response(
            {
                "data": data,
                "meta": {
                    "page": self.page.number,
                    "pageSize": self.page.paginator.per_page,
                    "total": self.page.paginator.count,
                },
            }
        )
