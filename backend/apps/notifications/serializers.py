"""Serializers de l'app `notifications` (lecture seule)."""


from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer[Notification]):
    destinataire_nom = serializers.CharField(read_only=True)
    type_libelle = serializers.CharField(source="get_type_display", read_only=True)
    canal_libelle = serializers.CharField(source="get_canal_display", read_only=True)
    statut_libelle = serializers.CharField(source="get_statut_display", read_only=True)
    rendez_vous_debut = serializers.DateTimeField(
        source="rendez_vous.debut", read_only=True, default=None
    )
    soin_nom = serializers.CharField(
        source="rendez_vous.soin.nom", read_only=True, default=None
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "destinataire",
            "destinataire_nom",
            "rendez_vous",
            "rendez_vous_debut",
            "soin_nom",
            "type",
            "type_libelle",
            "canal",
            "canal_libelle",
            "sujet",
            "message",
            "statut",
            "statut_libelle",
            "lue",
            "envoi_le",
            "erreur",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
