import math


def calculate_faction_price(base_cost: int, reputation_points: int) -> int:
    """Финальная цена с учётом репутации у фракции-поставщика."""
    if reputation_points < 0:
        return math.ceil(base_cost * 1.25)
    if reputation_points < 20:
        return base_cost
    if reputation_points < 50:
        return math.ceil(base_cost * 0.9)
    return math.ceil(base_cost * 0.75)
