SPECIALTIES: list[str] = [
    "Cardiology",
    "Neurology",
    "Oncology",
    "Pediatrics",
    "Orthopedics",
    "Dermatology",
    "Gastroenterology",
    "Pulmonology",
    "Endocrinology",
    "Nephrology",
    "Psychiatry",
    "Radiology",
    "Emergency Medicine",
    "Obstetrics & Gynecology",
    "Infectious Disease",
    "Surgery (General)",
    "Ophthalmology",
    "Anesthesiology",
    "Hematology",
    "Rheumatology",
    "Urology",
    "ENT / Otolaryngology",
    "Internal Medicine",
    "Family Medicine",
    "Critical Care / ICU Medicine",
]

_SPECIALTIES_LOWER: dict[str, str] = {s.lower(): s for s in SPECIALTIES}


def validate_and_normalize_specialty(name: str) -> str | None:
    """Return canonical specialty name if valid, None if not in the fixed list."""
    return _SPECIALTIES_LOWER.get(name.strip().lower())
