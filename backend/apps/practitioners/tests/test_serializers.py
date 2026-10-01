"""Tests des sérialiseurs de l'app `practitioners`.

Ces règles sont testées ici directement (et non seulement via l'API) pour
couvrir les messages d'erreur français et les normalisations (espaces
superflus) appliquées par les validateurs de champ.
"""

import pytest
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.accounts.tests.factories import (
    DentistFactory,
    PatientFactory,
)
from apps.practitioners.models import Cabinet
from apps.practitioners.serializers import (
    CabinetSerializer,
    PractitionerDetailSerializer,
    PractitionerListSerializer,
    PractitionerWriteSerializer,
    SpecialiteSerializer,
)
from apps.practitioners.tests.factories import (
    CabinetFactory,
    PractitionerFactory,
    SpecialiteFactory,
)

pytestmark = pytest.mark.django_db


# --------------------------------------------------------------- spécialités


def test_specialite_normalise_les_espaces_du_nom() -> None:
    serializer = SpecialiteSerializer(data={"nom": "  Endodontie  "})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["nom"] == "Endodontie"


def test_specialite_refuse_un_nom_vide() -> None:
    serializer = SpecialiteSerializer(data={"nom": "   "})
    assert not serializer.is_valid()
    assert "nom" in serializer.errors


def test_specialite_expose_son_nom() -> None:
    assert str(SpecialiteFactory(nom="Pédodontie")) == "Pédodontie"


# ------------------------------------------------------------------ cabinets


def test_cabinet_normalise_nom_et_adresse() -> None:
    serializer = CabinetSerializer(
        data={"nom": "  Clinique Nord ", "adresse": "  Rue 10  "}
    )
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["nom"] == "Clinique Nord"
    assert serializer.validated_data["adresse"] == "Rue 10"


def test_cabinet_refuse_un_nom_vide() -> None:
    serializer = CabinetSerializer(data={"nom": " ", "adresse": "Rue 10"})
    assert not serializer.is_valid()
    assert "nom" in serializer.errors


def test_cabinet_refuse_une_adresse_vide() -> None:
    serializer = CabinetSerializer(data={"nom": "Clinique", "adresse": "   "})
    assert not serializer.is_valid()
    assert "adresse" in serializer.errors


# ---------------------------------------------------------------- praticiens


def test_detail_praticien_projette_le_user() -> None:
    profil = PractitionerFactory()
    profil.user.nom = "Ndiaye"
    profil.user.prenom = "Awa"
    profil.user.save()

    data = PractitionerDetailSerializer(profil).data

    assert data["nom"] == "Ndiaye"
    assert data["prenom"] == "Awa"
    assert data["email"] == profil.user.email


def test_les_deux_serializers_exposent_le_prenom() -> None:
    """`prenom` doit être présent, pas silencieusement omis.

    Les deux sérialiseurs déclarent `prenom` en lecture seule : sans la
    propriété `Practitioner.prenom`, DRF l'écarterait de la réponse (le champ
    n'existe pas sur le modèle) au lieu de lever une erreur.
    """
    profil = PractitionerFactory()
    profil.user.prenom = "Awa"
    profil.user.save()

    for serializer_class in (PractitionerListSerializer, PractitionerDetailSerializer):
        data = serializer_class(profil).data
        assert "prenom" in data, serializer_class.__name__
        assert data["prenom"] == "Awa", serializer_class.__name__


def test_detail_praticien_inclut_les_soins_proposes() -> None:
    profil = PractitionerFactory()
    data = PractitionerDetailSerializer(profil).data
    assert isinstance(data["soins"], list)


def test_experience_plafonnee_a_80_ans() -> None:
    profil = PractitionerFactory()
    serializer = PractitionerDetailSerializer(profil, data={"annees_experience": 81})
    assert not serializer.is_valid()
    assert "80" in str(serializer.errors["annees_experience"])


def test_ecriture_refuse_un_utilisateur_non_dentiste() -> None:
    serializer = PractitionerWriteSerializer(
        data={"user": PatientFactory().id, "annees_experience": 3}
    )
    assert not serializer.is_valid()
    assert "dentiste" in str(serializer.errors["user"])


def test_ecriture_refuse_un_profil_deja_existant() -> None:
    profil = PractitionerFactory()
    serializer = PractitionerWriteSerializer(
        data={"user": profil.user_id, "annees_experience": 3}
    )
    assert not serializer.is_valid()
    assert "profil" in str(serializer.errors["user"])


def test_ecriture_accepte_un_utilisateur_dentiste_libre() -> None:
    serializer = PractitionerWriteSerializer(
        data={"user": DentistFactory().id, "annees_experience": 3}
    )
    assert serializer.is_valid(), serializer.errors


def test_ecriture_refuse_un_utilisateur_inconnu() -> None:
    """Le queryset du champ `user` n'est plus restreint aux dentistes.

    Il reste donc atteignable : l'utilisateur est résolu, puis `validate_user`
    renvoie le message métier en français.
    """
    serializer = PractitionerWriteSerializer(data={"user": 0})
    assert not serializer.is_valid()
    assert "introuvable" in str(serializer.errors["user"]).lower()


def test_le_prenom_est_delegue_par_le_modele() -> None:
    """La propriété exposée par le modèle, comme `nom`."""
    profil = PractitionerFactory()
    profil.user.prenom = "Awa"
    profil.user.save()

    assert profil.prenom == "Awa"
    assert profil.nom == profil.user.nom


def test_cabinet_comptabilise_les_praticiens() -> None:
    """L'annotation `nb_praticiens` est posée par le viewset."""
    from django.db.models import Count

    cabinet = CabinetFactory()
    PractitionerFactory(cabinet=cabinet)

    annote = (
        Cabinet.objects.filter(pk=cabinet.pk)
        .annotate(nb_praticiens=Count("praticiens"))
        .get()
    )
    assert annote.nb_praticiens == 1


def test_erreur_du_serieur_est_une_liste() -> None:
    """Les charges utiles `ValidationError` doivent être des listes.

    `core.exceptions` n'expose `fields` que si une valeur est de type liste ou
    dictionnaire ; une chaîne disparaîtrait de la réponse d'erreur.
    """
    with pytest.raises(DRFValidationError) as exc:
        SpecialiteSerializer(data={"nom": "  "}).is_valid(raise_exception=True)

    detail = exc.value.detail
    assert isinstance(detail, dict), detail
    for valeur in detail.values():
        assert isinstance(valeur, list), valeur
