import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.accounts.tests.factories import DentistFactory, PatientFactory
from apps.catalog.models import SoinPraticien
from apps.catalog.tests.factories import SoinFactory
from apps.practitioners.models import Practitioner
from apps.practitioners.tests.factories import (
    CabinetFactory,
    PractitionerFactory,
    SpecialiteFactory,
)

pytestmark = pytest.mark.django_db


def test_str_practitioner_et_cabinet() -> None:
    cabinet = CabinetFactory(nom="Clinique du Parc", ville="Dakar")
    praticien = PractitionerFactory(cabinet=cabinet)
    assert str(praticien) == f"Dr {praticien.user.prenom} {praticien.user.nom}"
    assert str(cabinet) == "Clinique du Parc — Dakar"
    assert str(SpecialiteFactory(nom="Endodontie")) == "Endodontie"


def test_propriete_nom_delegate_au_user() -> None:
    praticien = PractitionerFactory()
    assert praticien.nom == praticien.user.nom


def test_patient_ne_peut_pas_avoir_de_profil() -> None:
    user = PatientFactory()
    praticien = Practitioner(user=user)
    with pytest.raises(ValidationError) as exc:
        praticien.full_clean()
    assert "user" in exc.value.error_dict


def test_profil_unique_par_utilisateur() -> None:
    user = DentistFactory()
    PractitionerFactory(user=user)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Practitioner.objects.create(user=user)


def test_propose_refuse_si_pas_associe() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    assert praticien.propose(soin) is False


def test_propose_refuse_si_lien_inactif() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    SoinPraticien.objects.create(praticien=praticien, soin=soin, actif=False)
    assert praticien.propose(soin) is False


def test_propose_refuse_si_praticien_inactif() -> None:
    praticien = PractitionerFactory(actif=False)
    soin = SoinFactory()
    SoinPraticien.objects.create(praticien=praticien, soin=soin, actif=True)
    assert praticien.propose(soin) is False


def test_propose_accepte_si_actif() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    SoinPraticien.objects.create(praticien=praticien, soin=soin, actif=True)
    assert praticien.propose(soin) is True


def test_soin_praticien_unique_par_paire() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    SoinPraticien.objects.create(praticien=praticien, soin=soin)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            SoinPraticien.objects.create(praticien=praticien, soin=soin)


def test_tarif_effectif_survit_au_prix_specifique() -> None:
    soin = SoinFactory(prix_xof=15000)
    praticien = PractitionerFactory()
    lien = SoinPraticien.objects.create(praticien=praticien, soin=soin)
    assert lien.tarif_effectif == 15000

    lien.prix_xof = 12000
    assert lien.tarif_effectif == 12000
    assert str(lien).endswith(soin.nom)


def test_ordering_par_nom_utilisateur() -> None:
    bas = DentistFactory(nom="Aida")
    haut = DentistFactory(nom="Zacharie")
    PractitionerFactory(user=bas)
    PractitionerFactory(user=haut)

    praticiens = list(Practitioner.objects.order_by("user__nom"))
    assert [str(p.user_id) for p in praticiens] == [str(bas.id), str(haut.id)]
