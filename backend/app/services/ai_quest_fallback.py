import random
import re
from dataclasses import dataclass

from app.models.enums import QuestDifficulty, QuestType
from app.services.gold_economy import gold_for_difficulty

# Диапазоны XP (gold фиксирован таблицей gold_economy)
REWARD_RANGES: dict[QuestDifficulty, tuple[int, int]] = {
    QuestDifficulty.TRIVIAL: (10, 25),
    QuestDifficulty.EASY: (15, 35),
    QuestDifficulty.NORMAL: (25, 50),
    QuestDifficulty.HARD: (45, 80),
    QuestDifficulty.LEGENDARY: (80, 150),
}


@dataclass(frozen=True)
class FallbackRule:
    keywords: tuple[str, ...]
    descriptions: tuple[str, ...]
    quest_type: QuestType = QuestType.SIDE
    difficulty: QuestDifficulty = QuestDifficulty.NORMAL


FALLBACK_RULES: tuple[FallbackRule, ...] = (
    FallbackRule(
        keywords=("попуг", "кот", "кошк", "собак", "питом", "животн", "грифон", "фамильяр"),
        descriptions=(
            "В таверне шепчутся о беспокойном фамильяре, сбежавшем с башни мага. "
            "«{title}» — не рутина, а охота на редкого грифона-оборотня, притворяющегося домашним зверьком. "
            "Усмири зверя лаской и решимостью — гильдия одомашнивания щедро платит за такие дела.",
            "Местный алхимик ищет помощника: «{title}». "
            "По его словам, в подвале завёлся молодой грифон, что крадёт перья и мурлычет по ночам. "
            "Задача — поймать существо живьём и приручить, не превратив кухню в поле боя.",
            "Старейшина Гильдии Звероловов вручает свиток: «{title}». "
            "Речь идёт о фамильяре, освоившем магию иллюзий. Поймай его — и получишь репутацию среди укротителей.",
        ),
        difficulty=QuestDifficulty.NORMAL,
    ),
    FallbackRule(
        keywords=("убрать", "уборк", "помыть", "вымыть", "чист"),
        descriptions=(
            "Подземелье под таверной снова затопило слизью быта. "
            "Квест «{title}» — священная зачистка коридоров от пыли, паутины и загадочных куч носков. "
            "Местные называют это «рейдом на грязь»; награда скромная, но честь чистого меча бесценна.",
            "Хранитель храма просит: «{title}». "
            "Святилище заросло мхом прокрастинации — нужно изгнать хаос метлой и отвагой. "
            "Говорят, за каждым вымытым углом скрывается +1 к карме искателя.",
            "Гильдия дворников объявила контракт «{title}». "
            "Цель — вернуть крепости-башне (она же твоя квартира) статус «пригодно для квестов». "
            "Босс-файт с пылью неизбежен.",
        ),
        quest_type=QuestType.SIDE,
        difficulty=QuestDifficulty.TRIVIAL,
    ),
    FallbackRule(
        keywords=("босс", "финал", "драк", "побед"),
        descriptions=(
            "Гонец с горящей печатью вручает приказ: «{title}». "
            "Это не поручение — это объявление босс-файта. "
            "Собери экипировку, зарядись зельями и иди туда, где карта заканчивается вопросительным знаком.",
            "В дневнике появилась запись с красной печатью: «{title}». "
            "Старейшины говорят, что за этим названием скрывается сущность уровня «легендарный лут». "
            "Провал недопустим — весь посёлок смотрит на тебя.",
        ),
        quest_type=QuestType.MAIN,
        difficulty=QuestDifficulty.LEGENDARY,
    ),
    FallbackRule(
        keywords=("купить", "магазин", "заказ", "достав"),
        descriptions=(
            "Торговец на рыночной площади хлопает по прилавку: «{title}». "
            "Нужно пройти через толпу торговцев, сплетни и скидки — и вернуться с трофеями, "
            "не потратив всё золото на ненужные зелья красоты.",
            "Гильдия курьеров ищет добровольца для «{title}». "
            "Маршрут лежит через квартал иллюзий (скидочные витрины). "
            "Груз хрупкий, как твоя мотивация в понедельник утром.",
        ),
        difficulty=QuestDifficulty.TRIVIAL,
    ),
    FallbackRule(
        keywords=("звон", "позвон", "созвон", "встреч"),
        descriptions=(
            "Магический кристалл связи мигает: «{title}». "
            "Квест требует переговоров с дальним союзником через артефакт «телефон». "
            "Провалишь диалог — и репутация в гильдии дипломатов рухнет.",
            "Посланник ждёт у ворот: «{title}». "
            "Нужно установить контакт с NPC за пределами карты и не сбросить связь в самый драматичный момент.",
        ),
        difficulty=QuestDifficulty.NORMAL,
    ),
    FallbackRule(
        keywords=("учеб", "экзамен", "лекц", "домашн"),
        descriptions=(
            "Академия Мудрецов выдала задание: «{title}». "
            "Предстоит штурм башни знаний — томов, формул и дедлайнов. "
            "Сдавать босса-экзаменатора лучше подготовленным.",
            "В библиотеке-лабиринте открыт квест «{title}». "
            "Награда — опыт и титул «не сдался перед середой семестра».",
        ),
        quest_type=QuestType.MAIN,
        difficulty=QuestDifficulty.HARD,
    ),
    FallbackRule(
        keywords=("спорт", "тренир", "зал", "пробеж", "здоров"),
        descriptions=(
            "Жрец Святилища Силы благословляет путь: «{title}». "
            "Испытание телом укрепит дух — и, возможно, бедра. "
            "Каждый подход приближает к новому уровню выносливости.",
            "Монахи спортзала объявили ритуал: «{title}». "
            "Победи лень — главного элитного моба этого квартала.",
        ),
        difficulty=QuestDifficulty.NORMAL,
    ),
    FallbackRule(
        keywords=("готов", "рецепт", "кухн", "ужин", "обед"),
        descriptions=(
            "Повар таверны «Золотой котёл» просит: «{title}». "
            "Собери ингредиенты, победи сковороду и накорми гильдию ароматом победы. "
            "Провал пахнет горелым — буквально.",
            "Кулинарный квест «{title}» начинается у рассветной плиты. "
            "Алхимия вкуса требует точности, терпения и щепотки магии соли.",
        ),
        difficulty=QuestDifficulty.TRIVIAL,
    ),
    FallbackRule(
        keywords=("главн", "сюжет", "спасти", "спас"),
        descriptions=(
            "Совет старейшин объявил сюжетную арку: «{title}». "
            "От исхода зависит судьба поселения — и твой следующий уровень. "
            "Это не побочка, это главная линия твоей кампании.",
            "В небесах проступила руна судьбы: «{title}». "
            "Герой, которого ждали, — ты. Остальное — детали эпоса.",
        ),
        quest_type=QuestType.MAIN,
        difficulty=QuestDifficulty.HARD,
    ),
)

DEFAULT_DESCRIPTIONS: tuple[str, ...] = (
    "В кожаном переплёте дневника проступает новая запись: «{title}». "
    "Трактирщик клянётся, что за этим скрывается приключение, достойное песни барда.",
    "Гильдия искателей вывесила листовку: «{title}». "
    "Награда не громкая, зато путь обещает быть занятным — шепчут карты и старые путники.",
    "На перекрёстке дорог тебя останавливает странник: «{title}». "
    "Он не объясняет деталей, но глаза его светятся, как индикатор редкого квеста.",
    "Лунный свет освещает страницу с надписью «{title}». "
    "Интуиция подсказывает: стоит взяться сейчас, пока мир ещё в фазе «активен».",
    "В башне мага мерцает кристалл заданий. Новый контракт: «{title}». "
    "Маг говорит сухо, но в голосе слышна ставка — опыт, золото и немного славы.",
)


def _match_rule(title: str) -> FallbackRule | None:
    lowered = title.lower()
    for rule in FALLBACK_RULES:
        if any(keyword in lowered for keyword in rule.keywords):
            return rule
    return None


def _infer_difficulty_from_title(title: str) -> QuestDifficulty | None:
    lowered = title.lower()
    if any(w in lowered for w in ("легенд", "эпич", "босс", "финал")):
        return QuestDifficulty.LEGENDARY
    if any(w in lowered for w in ("сложн", "трудн", "опасн", "срочн")):
        return QuestDifficulty.HARD
    if any(w in lowered for w in ("мелк", "быстр", "прост", "лёгк", "легк")):
        return QuestDifficulty.TRIVIAL
    return None


def _roll_rewards(
    difficulty: QuestDifficulty,
    quest_type: QuestType,
) -> tuple[int, int]:
    xp_lo, xp_hi = REWARD_RANGES[difficulty]
    xp = random.randint(xp_lo, xp_hi)
    gold = gold_for_difficulty(difficulty)
    if quest_type == QuestType.MAIN:
        xp = int(xp * random.uniform(1.1, 1.35))
        gold = int(gold * random.uniform(1.1, 1.35))
    return xp, gold


def generate_smart_fallback(title: str) -> dict:
    """Локальная RPG-генерация по ключевым словам в названии."""
    rule = _match_rule(title)

    if rule:
        quest_type = rule.quest_type
        difficulty = rule.difficulty
        template = random.choice(rule.descriptions)
    else:
        quest_type = QuestType.SIDE
        inferred = _infer_difficulty_from_title(title)
        difficulty = inferred or random.choice(
            [
                QuestDifficulty.TRIVIAL,
                QuestDifficulty.NORMAL,
                QuestDifficulty.NORMAL,
                QuestDifficulty.HARD,
            ]
        )
        template = random.choice(DEFAULT_DESCRIPTIONS)

    description = template.format(title=title)
    # Убираем лишние пробелы после подстановки
    description = re.sub(r"\s+", " ", description).strip()

    xp_reward, gold_reward = _roll_rewards(difficulty, quest_type)

    return {
        "description": description,
        "quest_type": quest_type,
        "difficulty": difficulty,
        "xp_reward": xp_reward,
        "gold_reward": gold_reward,
    }
