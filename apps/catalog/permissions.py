"""Permissions du catalogue.

Le catalogue est lisible par tout utilisateur authentifié ; l'écriture est
réservée à l'administration (cf. `core.permissions.IsAdminRole`).
"""

from apps.core.permissions import IsReadOnlyOrStaff

__all__ = ["IsReadOnlyOrStaff"]
