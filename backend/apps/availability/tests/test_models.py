"""Tests des modèles de l'app `availability`."""

from datetime import time, timedelta

import pytest
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.utils import IntegrityError

from apps.availability.models import HoraireHebdomadaire
from apps.availability.tests.factories import (
    ExceptionDisponibiliteFactory,
    HoraireHebdomadaireFactory,
)
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db


def test_str_horaire() -> None:
    horaire = HoraireHebdomadaireFactory(
        jour=2, heure_debut=time(9, 0), heure_fin=time(12, 30)
    )
    assert str(horaire) == "Mercredi 09:00 - 12:30"


def test_str_exception_journee_entiere() -> None:
    exception = ExceptionDisponibiliteFactory(heure_debut=None, heure_fin=None)
    assert "journée entière" in str(exception)


def test_str_exception_avec_plage() -> None:
    exception = ExceptionDisponibiliteFactory(
        heure_debut=time(8, 0), heure_fin=time(9, 0), type="fermeture"
    )
    assert "08:00 - 09:00" in str(exception)


def test_heure_fin_apres_heure_debut_impose() -> None:
    with pytest.raises(IntegrityError):
        HoraireHebdomadaireFactory(heure_debut=time(13, 0), heure_fin=time(9, 0))


def test_unicite_horaire_par_jour_et_creneau() -> None:
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(praticien=praticien, jour=3, heure_debut=time(9, 0))
    with pytest.raises(IntegrityError):
        HoraireHebdomadaireFactory(praticien=praticien, jour=3, heure_debut=time(9, 0))


def test_deux_horaires_le_meme_jour_avec_heures_differentes() -> None:
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=3, heure_debut=time(9, 0), heure_fin=time(13, 0)
    )
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=3, heure_debut=time(14, 0), heure_fin=time(18, 0)
    )
    assert HoraireHebdomadaire.objects.filter(praticien=praticien, jour=3).count() == 2


def test_exception_avec_une_seule_heure_refusee() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        ExceptionDisponibiliteFactory(heure_debut=time(9, 0), heure_fin=None)


def test_exception_avec_heures_inversees_refusee() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        ExceptionDisponibiliteFactory(heure_debut=time(9, 0), heure_fin=time(8, 0))


def test_exception_clean_signale_les_heures_incompletes() -> None:
    exception = ExceptionDisponibiliteFactory.build(
        heure_debut=time(9, 0), heure_fin=None
    )
    with pytest.raises(ValidationError) as exc:
        exception.clean()
    assert "heure_debut" in exc.value.message_dict


def test_bloque_toute_la_journee() -> None:
    assert ExceptionDisponibiliteFactory().bloque_toute_la_journee is True
    assert (
        ExceptionDisponibiliteFactory(
            heure_debut=time(9, 0), heure_fin=time(10, 0)
        ).bloque_toute_la_journee
        is False
    )


def test_horaires_chevauchement() -> None:
    lundi_matin = HoraireHebdomadaireFactory(jour=0, heure_debut=time(9, 0))
    lundi_matin_suite = HoraireHebdomadaireFactory(
        praticien=lundi_matin.praticien, jour=0, heure_debut=time(11, 0)
    )
    mardi = HoraireHebdomadaireFactory(
        praticien=lundi_matin.praticien, jour=1, heure_debut=time(10, 0)
    )

    assert lundi_matin.chevauche(lundi_matin_suite) is True
    assert lundi_matin.chevauche(mardi) is False


def test_exception_dans_le_passe_est_acceptee_par_le_modele() -> None:
    """Le modèle ne bloque pas le passé : c'est le service qui refuse."""
    from datetime import date

    exception = ExceptionDisponibiliteFactory(date=date.today() - timedelta(days=30))
    assert exception.pk is not None
