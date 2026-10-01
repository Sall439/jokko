"""Tests de concurrence : la double réservation est impossible.

Deux mécanismes complémentaires sont vérifiés :

1. **Application** — `services.reserver()` verrouille la ligne du praticien
   (`SELECT ... FOR UPDATE`) et revalide le créneau sous verrou ;
2. **Base** — la contrainte d'exclusion PostgreSQL
   `appointments_rdv_pas_de_double_reservation` refuse tout chevauchement,
   même en cas d'écriture directe.

Ces tests utilisent `transaction=True` (vraies transactions) : le décorateur
`pytest.mark.django_db` poserait une transaction qui ne serait jamais validée,
et les verrous ne seraient donc pas visibles entre threads.
"""

import threading
from datetime import date, time, timedelta
from typing import Any

import pytest
from django.db import connection
from freezegun import freeze_time
from rest_framework.exceptions import ValidationError

from apps.appointments.models import Appointment
from apps.appointments.services import reserver
from apps.availability.tests.factories import HoraireHebdomadaireFactory
from apps.catalog.tests.factories import SoinFactory
from apps.core.utils import combine_local
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db(transaction=True)

INSTANT = "2030-06-01 07:00:00+00:00"
LUNDI = date(2030, 6, 3)


def _plateau() -> tuple[Any, Any]:
    """Praticien ouvert le lundi 09h-13h + soin de 60 min proposé."""
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=0, heure_debut=time(9, 0), heure_fin=time(13, 0)
    )
    soin = SoinFactory(duree_minutes=60)
    proposer_soin(praticien, soin)
    return praticien, soin


def _lancer(nombre: int, action: Any) -> list[Any]:
    """Exécute `action` dans `nombre` threads et renvoie leurs résultats."""

    resultats: list[Any] = []
    verrou = threading.Lock()
    depart = threading.Barrier(nombre)

    def cible(index: int) -> None:
        try:
            depart.wait(timeout=10)
            try:
                valeur = action(index)
            except BaseException as exc:  # noqa: BLE001 - remonté au test
                valeur = exc
            with verrou:
                resultats.append(valeur)
        finally:
            connection.close()

    threads = [threading.Thread(target=cible, args=(i,)) for i in range(nombre)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    return resultats


@freeze_time(INSTANT)
def test_deux_reservations_simultanes_meme_creneau() -> None:
    """Quatre patients en parallèle : un seul obtient le créneau."""
    praticien, soin = _plateau()
    debut = combine_local(LUNDI, time(9, 0))

    from apps.accounts.tests.factories import PatientFactory

    patients = [PatientFactory() for _ in range(4)]

    def action(index: int) -> Any:
        return reserver(
            patient=patients[index], praticien=praticien, soin=soin, debut=debut
        )

    resultats = _lancer(len(patients), action)
    reussites = [r for r in resultats if isinstance(r, Appointment)]
    refus = [r for r in resultats if isinstance(r, ValidationError)]

    assert len(reussites) == 1
    assert len(refus) == len(patients) - 1
    assert Appointment.objects.filter(praticien=praticien, debut=debut).count() == 1


@freeze_time(INSTANT)
def test_deux_reservations_simultanes_creneaux_differents() -> None:
    """Deux threads sur deux créneaux distincts : les deux réussissent."""
    praticien, soin = _plateau()
    from apps.accounts.tests.factories import PatientFactory

    debut_a = combine_local(LUNDI, time(9, 0))
    debut_b = combine_local(LUNDI, time(10, 0))

    def action(index: int) -> Any:
        debut = debut_a if index == 0 else debut_b
        return reserver(
            patient=PatientFactory(), praticien=praticien, soin=soin, debut=debut
        )

    resultats = _lancer(2, action)
    assert all(isinstance(r, Appointment) for r in resultats)
    assert Appointment.objects.filter(praticien=praticien).count() == 2


@freeze_time(INSTANT)
def test_reservation_pendant_qu_un_autre_est_valide() -> None:
    """Le verrou sérialise : le second appel voit le créneau déjà pris."""
    praticien, soin = _plateau()
    debut = combine_local(LUNDI, time(9, 0))

    def action(index: int) -> Any:
        from apps.accounts.tests.factories import PatientFactory

        return reserver(
            patient=PatientFactory(), praticien=praticien, soin=soin, debut=debut
        )

    resultats = _lancer(2, action)
    codes = [
        code
        for r in resultats
        if isinstance(r, ValidationError)
        for code in _aplatir(r.get_codes())
    ]
    assert len([r for r in resultats if isinstance(r, Appointment)]) == 1
    assert "slot_unavailable" in codes


def _aplatir(codes: Any) -> list[str]:
    """`get_codes()` peut renvoyer un scalaire ou une liste selon la forme."""
    if isinstance(codes, str):
        return [codes]
    if isinstance(codes, list):
        return [str(code) for code in codes]
    return [str(code) for valeurs in codes.values() for code in _aplatir(valeurs)]


@freeze_time(INSTANT)
def test_reserver_verrouille_la_ligne_du_praticien() -> None:
    """Le service prend bien un verrou `SELECT ... FOR UPDATE`.

    C'est la première barrière applicative : deux réservations concurrentes
    sur le même praticien sont sérialisées *avant* toute écriture.
    """
    from django.test.utils import CaptureQueriesContext

    from apps.accounts.tests.factories import PatientFactory

    praticien, soin = _plateau()
    debut = combine_local(LUNDI, time(9, 0))

    with CaptureQueriesContext(connection) as requetes:
        reserver(
            patient=PatientFactory(),
            praticien=praticien,
            soin=soin,
            debut=debut,
        )

    verrous = [q["sql"] for q in requetes.captured_queries if "FOR UPDATE" in q["sql"]]
    assert verrous, "reserver() doit verrouiller la ligne du praticien"
    # Django inline les paramètres : l'UUID apparaît sans tirets.
    assert any(str(praticien.pk).replace("-", "") in sql for sql in verrous)


@freeze_time(INSTANT)
def test_contrainte_d_exclusion_bloque_une_ecriture_directe() -> None:
    """Même sans passer par le service, la base refuse le chevauchement."""
    from django.db import IntegrityError, transaction

    from apps.accounts.tests.factories import PatientFactory

    praticien, soin = _plateau()
    debut = combine_local(LUNDI, time(9, 0))
    fin = debut + timedelta(minutes=60)

    Appointment.objects.create(
        patient=PatientFactory(),
        praticien=praticien,
        soin=soin,
        debut=debut,
        fin=fin,
        prix_xof=soin.prix_xof,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        Appointment.objects.create(
            patient=PatientFactory(),
            praticien=praticien,
            soin=soin,
            debut=debut + timedelta(minutes=30),
            fin=fin + timedelta(minutes=30),
            prix_xof=soin.prix_xof,
        )


@freeze_time(INSTANT)
def test_unicite_praticien_debut_refuse_en_base() -> None:
    """Filet portable : deux rendez-vous actifs ne peuvent pas commencer pareil."""
    from django.db import IntegrityError, transaction

    from apps.accounts.tests.factories import PatientFactory

    praticien, soin = _plateau()
    debut = combine_local(LUNDI, time(9, 0))

    Appointment.objects.create(
        patient=PatientFactory(),
        praticien=praticien,
        soin=soin,
        debut=debut,
        fin=debut + timedelta(minutes=60),
        prix_xof=soin.prix_xof,
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        Appointment.objects.create(
            patient=PatientFactory(),
            praticien=praticien,
            soin=soin,
            debut=debut,
            fin=debut + timedelta(minutes=60),
            prix_xof=soin.prix_xof,
        )
