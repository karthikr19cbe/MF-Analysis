"""
Herfindahl-Hirschman Index (HHI) calculation for portfolio concentration analysis.
"""


def calculate_hhi(weights: list[float]) -> float:
    """
    Calculate the Herfindahl-Hirschman Index.

    Args:
        weights: List of fractional weights (each between 0 and 1, summing to ~1.0).
                 If weights don't sum to 1, they are normalized first.

    Returns:
        HHI value between 0 and 1. Higher = more concentrated.
    """
    if not weights:
        return 0.0

    total = sum(weights)
    if total <= 0:
        return 0.0

    # Normalize to fractions summing to 1
    normalized = [w / total for w in weights]
    return sum(w * w for w in normalized)


def interpret_hhi(hhi: float) -> str:
    """
    Interpret the HHI value.

    Returns:
        Human-readable interpretation string.
    """
    if hhi >= 0.25:
        return "Highly Concentrated"
    elif hhi >= 0.15:
        return "Moderate"
    else:
        return "Diversified"
