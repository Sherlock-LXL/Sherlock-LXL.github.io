import numpy as np
try:
    import msvcrt
except ImportError:
    msvcrt = None

def show_splash() -> None:
    print("=" * 30)
    print("送礼选择器 / Gift Chooser")
    print("由李湘伦 (Sherlock Lee) 制作")
    print("=" * 30)
    print()

TEXT = {
    "zh": {
        "language_title": "请选择语言 / Please select a language: ",
        "language_options": "1. 中文\n2. English",
        "language_prompt": "请输入选项 / Enter your choice: ",
        "language_error": "请输入 1 或 2。",

        "score_instruction": "请根据以下标准，在 0~10 分范围内评分。",
        "score_prompt": "请输入分数: ",
        "score_range_error": "分数必须在 0~10 之间，请重新输入。",
        "score_type_error": "请输入数字，例如 7、8.5 或 10。",

        "category_title": "礼物属于哪类物品？",
        "category_instruction": "请在 1~7 中选择最符合的类别。",
        "category_prompt": "请输入类别编号: ",
        "category_range_error": "选项必须在 1~7 之间，请重新输入。",
        "category_type_error": "请输入整数，例如 1、3 或 7。",

        "completed": "信息输入完成。",
        "exit_prompt": "\n预测完成。按 Esc 键退出程序。",
        "exit_fallback": "\n预测完成。按 Enter 键退出程序。",
    },
    "en": {
        "language_title": "请选择语言 / Please select a language: ",
        "language_options": "1. 中文\n2. English",
        "language_prompt": "请输入选项 / Enter your choice: ",
        "language_error": "Please enter 1 or 2.",

        "score_instruction": "Rate the gift from 0 to 10 using the guide below.",
        "score_prompt": "Enter a score: ",
        "score_range_error": "The score must be between 0 and 10.",
        "score_type_error": "Please enter a number, such as 7, 8.5, or 10.",

        "category_title": "Which category best describes the gift?",
        "category_instruction": "Choose the most suitable category from 1 to 7.",
        "category_prompt": "Enter the category number: ",
        "category_range_error": "The option must be between 1 and 7.",
        "category_type_error": "Please enter an integer, such as 1, 3, or 7.",

        "completed": "Input completed.",
        "exit_prompt": "\nPrediction complete. Press Esc to exit.",
        "exit_fallback": "\nPrediction complete. Press Enter to exit.",
    },
}

SCORE_QUESTIONS = {
    "zh": [
        {
            "name": "明确兴趣匹配",
            "question": "对方是否明确表示对这件礼物感兴趣？",
            "guide": [
                "9~10: 对方明确提过这件商品、品牌、作品、风格或材质。",
                "7~8: 明确喜欢相应品牌、系列、风格或礼物类别。",
                "5~6: 只知道对方通常喜欢这一大类物品。",
                "3~4: 与兴趣只有较弱的关联，主要依靠推测。",
                "0~2: 对方明确不喜欢、不需要，或与其偏好冲突。",
            ],
        },
        {
            "name": "需求实用综合",
            "question": "这件礼物是否符合当前需求，并具有实际使用价值？",
            "guide": [
                "9~10: 当前明确需要，并且几乎每天都会使用。",
                "7~8: 有清楚的需求，预计每周会频繁使用。",
                "5~6: 有一定用途，但使用频率不高，也不紧急。",
                "3~4: 用途有限，或已经拥有相似物品。",
                "0~2: 明确不需要、已有很多，或很可能闲置。",
            ],
        },
        {
            "name": "情感个性化",
            "question": "这件礼物对对方或你们的关系是否具有特殊意义？",
            "guide": [
                "9~10: 对应共同记忆、私人含义或长期愿望，难以被替代。",
                "7~8: 能明显体现你对对方的了解和你们的关系。",
                "5~6: 与对方兴趣有关，但仍属于比较常见的选择。",
                "3~4: 有一点心意，但整体较为通用。",
                "0~2: 几乎没有个性化，换一个人也同样适用。",
            ],
        },
        {
            "name": "审美命中把握",
            "question": "你有多大把握认为这件礼物符合对方的审美？",
            "guide": [
                "9~10: 对方明确选中过该物品，或明确喜欢高度相似的款式。",
                "7~8: 已知对方稳定喜欢相应品牌、颜色、材质或风格。",
                "5~6: 设计较为中性、安全，但没有直接证据。",
                "3~4: 主要依靠猜测，审美是否命中并不确定。",
                "0~2: 已知与对方的颜色、款式或风格偏好冲突。",
            ],
        },
        {
            "name": "选择安全度",
            "question": "这件礼物是否不容易因为型号、尺寸、色号等因素选错？",
            "guide": [
                "9~10: 具体款式、型号、尺寸或版本已经确认。",
                "7~8: 大多数关键条件都已经知道，选错概率较低。",
                "5~6: 存在一定不确定性，但整体风险可以接受。",
                "3~4: 高度依赖尺寸、色号、肤质、发质、香味或兼容性。",
                "0~2: 关键条件几乎未知，容易选错且不方便退换。",
            ],
        },
        {
            "name": "收纳友好度",
            "question": "这件礼物是否便于存放，并且不容易造成重复或收纳负担？",
            "guide": [
                "9~10: 体积小、容易存放、可消耗，且几乎不会重复。",
                "7~8: 只带来很轻微的收纳或重复负担。",
                "5~6: 需要一定空间，或可能与已有物品重复。",
                "3~4: 类似物品已经较多，体积较大或可能闲置。",
                "0~2: 会造成明显的杂物、重复或严重收纳压力。",
            ],
        },
        {
            "name": "价值匹配",
            "question": "这件礼物的价格是否与质量、设计和实际价值相匹配？",
            "guide": [
                "预算参考: 学生情侣，通常不超过 1000 元；接近 1000 元已属于较贵。",
                "9~10: 价格处于舒适预算内，而且质量和用途明显值得。",
                "7~8: 价格与质量、设计、品牌和使用价值比较匹配。",
                "5~6: 价格可以接受，但整体价值比较普通。",
                "3~4: 价格偏高、品牌溢价明显，或与使用频率不匹配。",
                "0~2: 明显超出预算、性价比很低，或极可能闲置。",
            ],
        },
    ],
    "en": [
        {
            "name": "Explicit interest match",
            "question": "Has the recipient clearly shown interest in this gift?",
            "guide": [
                "9~10: They explicitly mentioned this exact item, brand, work, style, or material.",
                "7~8: They clearly like the relevant brand, series, style, or gift category.",
                "5~6: You only know that they generally like this broad type of item.",
                "3~4: The connection to their interests is weak and mainly inferred.",
                "0~2: They explicitly dislike it, do not need it, or it conflicts with their preferences.",
            ],
        },
        {
            "name": "Need and utility",
            "question": "Does the gift meet a current need and provide practical value?",
            "guide": [
                "9~10: It is currently needed and would be used almost every day.",
                "7~8: There is a clear need, and it would probably be used frequently each week.",
                "5~6: It has some use, but use would be occasional and it is not urgent.",
                "3~4: Its usefulness is limited, or the recipient already owns something similar.",
                "0~2: It is clearly unnecessary, already plentiful, or likely to remain unused.",
            ],
        },
        {
            "name": "Emotional personalization",
            "question": "Does the gift have special meaning for the recipient or your relationship?",
            "guide": [
                "9~10: It connects to a shared memory, private meaning, or long-term wish and is difficult to replace.",
                "7~8: It strongly reflects your understanding of the recipient and your relationship.",
                "5~6: It relates to their interests but is still a fairly common choice.",
                "3~4: It shows some thought but remains mostly generic.",
                "0~2: It has almost no personalization and could be given to nearly anyone.",
            ],
        },
        {
            "name": "Aesthetic confidence",
            "question": "How confident are you that the gift matches the recipient's taste?",
            "guide": [
                "9~10: They selected this exact item or explicitly liked something highly similar.",
                "7~8: Their preferred brand, color, material, or style is known and stable.",
                "5~6: The design is relatively neutral and safe, but direct evidence is limited.",
                "3~4: The choice is mainly a guess, and the aesthetic match is uncertain.",
                "0~2: It clearly conflicts with their known color, design, or style preferences.",
            ],
        },
        {
            "name": "Selection safety",
            "question": "How unlikely is the gift to be wrong because of size, shade, model, or compatibility?",
            "guide": [
                "9~10: The exact model, version, size, shade, or style has been confirmed.",
                "7~8: Most important conditions are known, so the risk of a wrong choice is low.",
                "5~6: There is moderate uncertainty, but the risk is still acceptable.",
                "3~4: The choice depends strongly on size, shade, skin type, hair type, scent, or compatibility.",
                "0~2: Key conditions are unknown, the choice is likely to be wrong, and returns may be difficult.",
            ],
        },
        {
            "name": "Storage friendliness",
            "question": "Is the gift easy to store without creating clutter or duplication?",
            "guide": [
                "9~10: It is compact, easy to store, consumable, and unlikely to duplicate existing items.",
                "7~8: It creates only a very small storage or duplication burden.",
                "5~6: It requires some space or may overlap with existing belongings.",
                "3~4: Similar items are already plentiful, or it is bulky and may remain unused.",
                "0~2: It would create substantial clutter, duplication, or storage pressure.",
            ],
        },
        {
            "name": "Value fit",
            "question": "Is the price justified by the quality, design, and likely use of the gift?",
            "guide": [
                "Budget reference: for a student couple, the normal budget is at or below RMB 1,000; close to RMB 1,000 is already expensive.",
                "9~10: It is comfortably within budget and clearly worth its quality and usefulness.",
                "7~8: Price, quality, design, brand, and practical value are reasonably aligned.",
                "5~6: The price is acceptable, but the overall value is ordinary.",
                "3~4: It is expensive, carries substantial brand premium, or is poorly matched to expected use.",
                "0~2: It is clearly over budget, poor value, or highly likely to remain unused.",
            ],
        },
    ],
}

CATEGORIES = {
    "zh": [
        "首饰配饰",
        "周边收藏",
        "书籍文创",
        "电子影像",
        "美妆香氛",
        "包袋服饰",
        "生活日用",
    ],
    "en": [
        "Jewelry and accessories",
        "Fandom and collectibles",
        "Books and stationery",
        "Electronics and imaging",
        "Beauty and fragrance",
        "Bags and clothing",
        "Daily-life items",
    ],
}

SCORE_BANDS = {
    "zh": [
        {
            "minimum": 9.0,
            "title": "非常推荐",
            "comment": (
                "这件礼物与ta的偏好高度吻合，整体风险很低。"
                "只要实际商品质量可靠，它很可能成为一次给ta留下深刻印象的选择。"
            ),
        },
        {
            "minimum": 8.1,
            "title": "很有希望",
            "comment": (
                "这是一件匹配度很高的礼物，大部分关键条件都比较靠谱。"
                "在购买前再确认一下细节，通常就可以放心选择。"
            ),
        },
        {
            "minimum": 7.0,
            "title": "值得考虑",
            "comment": (
                "整体方向是对的，ta大概率会喜欢。"
                "不过仍有部分不确定因素，稍作调整后会更稳妥。"
            ),
        },
        {
            "minimum": 6.0,
            "title": "有一定潜力",
            "comment": (
                "这件礼物具有一些明显优点，但不是特别靠谱。"
                "建议重点改善最低分的环节，再决定是否购买。"
            ),
        },
        {
            "minimum": 5.3,
            "title": "略偏正面",
            "comment": (
                "这件礼物可能不会出错，但也未必能带来很强的惊喜感。"
                "增加个性化元素或进一步确认需求，会让礼物更有分量。"
            ),
        },
        {
            "minimum": 3.8,
            "title": "匹配度不明确",
            "comment": (
                "目前支持和反对这件礼物的因素占比有点接近。"
                "不建议只凭直觉购买，最好先获取更多偏好信息。"
            ),
        },
        {
            "minimum": 2.1,
            "title": "风险较高",
            "comment": (
                "这件礼物存在较明显的不匹配风险。"
                "除非能够确认关键条件，否则更换方向通常会更加稳妥。"
            ),
        },
        {
            "minimum": 0.0,
            "title": "不太推荐",
            "comment": (
                "这件礼物与当前已知偏好明显不符，或存在严重的选择风险。"
                "建议重新选择类别，而不是只调整具体款式。"
            ),
        },
    ],
    "en": [
        {
            "minimum": 9.0,
            "title": "Highly recommended",
            "comment": (
                "This gift matches the recipient's preferences extremely well "
                "and carries very little overall risk. Provided that the product "
                "quality is reliable, it could be a particularly memorable choice."
            ),
        },
        {
            "minimum": 8.1,
            "title": "Very promising",
            "comment": (
                "This is a strong match, and most of the important conditions "
                "appear reliable. Confirming one or two final details should make "
                "it a safe choice."
            ),
        },
        {
            "minimum": 7.0,
            "title": "Worth considering",
            "comment": (
                "The overall direction is good, and the recipient is reasonably "
                "likely to enjoy it. A few uncertain details may still benefit "
                "from adjustment."
            ),
        },
        {
            "minimum": 6.0,
            "title": "Some potential",
            "comment": (
                "The gift has clear strengths, but it is not completely secure yet. "
                "Improving the weakest factor would make the decision more reliable."
            ),
        },
        {
            "minimum": 5.3,
            "title": "Slightly positive",
            "comment": (
                "The gift may be acceptable, but it may not feel especially exciting. "
                "More personalization or clearer confirmation of need could improve it."
            ),
        },
        {
            "minimum": 3.8,
            "title": "Uncertain match",
            "comment": (
                "The positive and negative factors are currently quite balanced. "
                "It would be better to gather more information before purchasing."
            ),
        },
        {
            "minimum": 2.1,
            "title": "High risk",
            "comment": (
                "There are noticeable signs of mismatch or selection risk. "
                "Unless the key uncertainties can be resolved, another direction "
                "would probably be safer."
            ),
        },
        {
            "minimum": 0.0,
            "title": "Not recommended",
            "comment": (
                "The gift conflicts with the currently known preferences or carries "
                "serious selection risk. Choosing a different category may be better "
                "than simply changing the specific product."
            ),
        },
    ],
}

FEATURE_FEEDBACK = {
    "zh": [
        {
            "name": "兴趣匹配",
            "strength": "ta对这类礼物的兴趣比较明确，这是当前方案最可靠的基础之一。",
            "suggestion": (
                "兴趣匹配目前偏弱。可以确认ta是否主动提过这件物品、"
                "对应品牌、作品、材质或具体风格。"
            ),
        },
        {
            "name": "需求与实用性",
            "strength": "这件礼物具有较好的实际用途，不容易只在收到时开心一次。",
            "suggestion": (
                "实际需求目前不够清楚。可以优先选择近期确实需要、"
                "能高频使用或能够解决具体问题的礼物。"
            ),
        },
        {
            "name": "情感个性化",
            "strength": "这件礼物能够体现你对ta的了解，情感价值是明显优势。",
            "suggestion": (
                "个性化程度还有提升空间。可以加入手写卡片、共同记忆、"
                "特殊日期或只有你们理解的细节。"
            ),
        },
        {
            "name": "审美匹配",
            "strength": "你对ta审美的判断比较有把握，款式本身不太容易踩雷。",
            "suggestion": (
                "审美命中把握偏低。建议参考ta已经拥有并经常使用的颜色、"
                "材质、品牌和设计风格，避免只按照自己的审美选择。"
            ),
        },
        {
            "name": "选择安全度",
            "strength": "型号、尺寸或版本等关键条件比较明确，选错的可能性较低。",
            "suggestion": (
                "这件礼物存在选错风险。购买前应确认尺寸、色号、型号、"
                "香型、肤质、兼容性或退换政策。"
            ),
        },
        {
            "name": "收纳友好度",
            "strength": "礼物容易保存，也不太会造成重复或杂物负担。",
            "suggestion": (
                "收纳负担可能偏高。可以改为更小巧、可消耗、可替换，"
                "或不会与已有物品重复的选择。"
            ),
        },
        {
            "name": "价值匹配",
            "strength": "价格与质量、用途和情感价值比较匹配，预算使用较为合理。",
            "suggestion": (
                "价格与价值的匹配度偏低。建议比较同类替代品，减少品牌溢价，"
                "并考虑ta实际使用的频率是否足以支撑这个价格。"
            ),
        },
    ],
    "en": [
        {
            "name": "Interest match",
            "strength": (
                "The recipient's interest in this type of gift appears clear, "
                "providing a reliable foundation for the choice."
            ),
            "suggestion": (
                "The interest match is currently weak. Check whether the recipient "
                "has explicitly mentioned the item, brand, work, material, or style."
            ),
        },
        {
            "name": "Need and utility",
            "strength": (
                "The gift has strong practical value and is unlikely to be appreciated "
                "only at the moment it is received."
            ),
            "suggestion": (
                "The practical need is unclear. Consider something currently needed, "
                "frequently used, or capable of solving a specific problem."
            ),
        },
        {
            "name": "Emotional personalization",
            "strength": (
                "The gift reflects a meaningful understanding of the recipient, "
                "giving it strong emotional value."
            ),
            "suggestion": (
                "The gift could be more personal. Add a handwritten note, shared memory, "
                "special date, or a detail meaningful specifically to your relationship."
            ),
        },
        {
            "name": "Aesthetic match",
            "strength": (
                "Your confidence in the recipient's taste is high, so the design "
                "is relatively unlikely to miss."
            ),
            "suggestion": (
                "Aesthetic confidence is low. Refer to colors, materials, brands, "
                "and styles the recipient already owns and uses frequently."
            ),
        },
        {
            "name": "Selection safety",
            "strength": (
                "Important details such as model, size, or version appear well confirmed, "
                "reducing the chance of a wrong choice."
            ),
            "suggestion": (
                "The gift carries selection risk. Confirm size, shade, model, scent, "
                "skin type, compatibility, and return conditions before purchasing."
            ),
        },
        {
            "name": "Storage friendliness",
            "strength": (
                "The gift is easy to store and is unlikely to create duplication or clutter."
            ),
            "suggestion": (
                "The gift may create storage pressure. Consider something smaller, "
                "consumable, replaceable, or less likely to duplicate existing belongings."
            ),
        },
        {
            "name": "Value fit",
            "strength": (
                "The price appears well matched to the quality, usefulness, and emotional value."
            ),
            "suggestion": (
                "The price-to-value fit is weak. Compare alternatives, reduce brand premium, "
                "and consider whether expected use justifies the cost."
            ),
        },
    ],
}

CATEGORY_TIPS = {
    "zh": [
        "首饰配饰提示: 确认材质、尺寸、佩戴习惯，以及是否存在金属过敏。",
        "周边收藏提示: 确认作品或角色确实喜欢，并优先选择正版和便于收纳的款式。",
        "书籍文创提示: 确认版本、装帧、语言，以及ta是否已经拥有同一本书。",
        "电子影像提示: 确认设备兼容性、存储需求、保修情况和实际使用场景。",
        "美妆香氛提示: 重点确认色号、肤质、发质、香调偏好和过敏风险。",
        "包袋服饰提示: 重点确认尺寸、颜色、日常穿搭风格和退换条件。",
        "生活日用提示: 实用并不等于适合送礼，最好确认是ta真正需要的款式。",
    ],
    "en": [
        "Jewelry tip: confirm material, size, wearing habits, and possible metal allergies.",
        "Collectibles tip: confirm the exact work or character, and prioritize authentic, easy-to-store items.",
        "Books and stationery tip: confirm the edition, design, language, and whether the recipient already owns it.",
        "Electronics tip: confirm compatibility, storage requirements, warranty, and the intended use case.",
        "Beauty and fragrance tip: confirm shade, skin type, hair type, scent preference, and allergy risks.",
        "Bags and clothing tip: confirm size, color, everyday style, and return conditions.",
        "Daily-life item tip: usefulness alone does not make a good gift; confirm that it is the specific version they want.",
    ],
}

RESULT_TEXT = {
    "zh": {
        "title": "\n预测结果",
        "score": "预计喜欢指数",
        "scale": "分 (满分 10 分)",
        "judgement": "综合评价",
        "strength": "优势分析",
        "suggestions": "改进建议",
        "category_tip": "类别提醒",
        "disclaimer": (
            "提示: 结果是基于当前输入和已有训练数据的估计，"
            "不能完全替代你对ta的真实了解。"
        ),
    },
    "en": {
        "title": "\nPrediction Result",
        "score": "Estimated liking score",
        "scale": "out of 10",
        "judgement": "Overall assessment",
        "strength": "Strength analysis",
        "suggestions": "Suggestions",
        "category_tip": "Category reminder",
        "disclaimer": (
            "Note: This result is an estimate based on the current answers "
            "and training data. It cannot replace your real understanding of the recipient."
        ),
    },
}

def choose_language() -> str:
    print(TEXT["zh"]["language_title"])
    print(TEXT["zh"]["language_options"])
    while True:
        choice = input(TEXT["zh"]["language_prompt"]).strip()
        if choice == "1":
            return "zh"
        if choice == "2":
            return "en"
        print(TEXT["zh"]["language_error"])

def ask_score(
    question_data: dict,
    language: str,
) -> float:
    text = TEXT[language]
    print()
    print(f'[{question_data["name"]}]')
    print(question_data["question"])
    print(text["score_instruction"])
    for line in question_data["guide"]:
        print(f"  {line}")
    while True:
        try:
            score = float(input(text["score_prompt"]))
            if 0 <= score <= 10:
                return score / 10
            print(text["score_range_error"])
        except ValueError:
            print(text["score_type_error"])

def ask_category(language: str) -> int:
    text = TEXT[language]
    categories = CATEGORIES[language]
    print()
    print(f'[{text["category_title"]}]')
    print(text["category_instruction"])
    for index, category_name in enumerate(categories, start=1):
        print(f"{index}. {category_name}")
    while True:
        try:
            choice = int(input(text["category_prompt"]))
            if 1 <= choice <= len(categories):
                return choice - 1
            print(text["category_range_error"])
        except ValueError:
            print(text["category_type_error"])

def collect_input() -> tuple[np.ndarray, str]:
    language = choose_language()
    text = TEXT[language]
    input_data = np.zeros((1, 14), dtype=float)
    questions = SCORE_QUESTIONS[language]
    for feature_index, question_data in enumerate(questions):
        input_data[0, feature_index] = ask_score(
            question_data,
            language,
        )
    category_index = ask_category(language)
    category_start_index = 7
    input_data[0, category_start_index + category_index] = 1.0
    print()
    print(text["completed"])
    return input_data, language

def get_score_band(
    display_score: float,
    language: str,
) -> dict:
    for band in SCORE_BANDS[language]:
        if display_score >= band["minimum"]:
            return band
    return SCORE_BANDS[language][-1]

def generate_personalized_feedback(
    input_data: np.ndarray,
    language: str,
) -> tuple[str, list[str], str]:
    feature_scores = input_data[0, :7]
    strongest_index = int(np.argmax(feature_scores))
    strongest_score = float(feature_scores[strongest_index])
    strongest_feedback = FEATURE_FEEDBACK[language][strongest_index]
    if strongest_score >= 0.70:
        strength_text = strongest_feedback["strength"]
    elif strongest_score >= 0.50:
        if language == "zh":
            strength_text = (
                f'{strongest_feedback["name"]}是当前相对较稳定的一项，'
                f"但得分只有 {strongest_score * 10:.1f}/10，"
                "暂时还不足以视为明显优势。"
            )
        else:
            strength_text = (
                f'{strongest_feedback["name"]} is currently the relatively '
                f"strongest factor, but its score is only "
                f"{strongest_score * 10:.1f}/10, so it is not yet a clear strength."
            )
    else:
        if language == "zh":
            strength_text = (
                "当前七项指标都偏低，还没有明显优势。"
                "建议先重新确认礼物方向，再考虑具体款式。"
            )
        else:
            strength_text = (
                "All seven factors are currently low, so there is no clear strength. "
                "Reconsider the overall gift direction before choosing a specific item."
            )
    ranked_indices = np.argsort(feature_scores)
    suggestions = []
    for feature_index in ranked_indices:
        feature_score = feature_scores[feature_index]
        if feature_score < 0.75:
            feedback = FEATURE_FEEDBACK[language][feature_index]
            score_out_of_ten = feature_score * 10
            suggestions.append(
                f'{feedback["name"]} ({score_out_of_ten:.1f}/10): '
                f'{feedback["suggestion"]}'
            )
        if len(suggestions) == 2:
            break
    if not suggestions:
        if language == "zh":
            suggestions.append(
                "七项指标都比较稳定。目前不需要大幅修改方案，"
                "购买前确认商品质量和快递时间即可。"
            )
        else:
            suggestions.append(
                "All seven factors are relatively strong. No major adjustment is needed; "
                "simply confirm product quality and delivery timing."
            )
    category_values = input_data[0, 7:14]
    category_index = int(np.argmax(category_values))
    category_tip = CATEGORY_TIPS[language][category_index]
    return strength_text, suggestions, category_tip

def show_result(
    display_score: float,
    input_data: np.ndarray,
    language: str,
) -> None:
    text = RESULT_TEXT[language]
    band = get_score_band(
        display_score,
        language,
    )
    strength, suggestions, category_tip = generate_personalized_feedback(
        input_data,
        language,
    )
    print(text["title"])
    print("=" * 68)
    print(
        f'{text["score"]}: '
        f"{display_score:.2f} "
        f'{text["scale"]}'
    )
    print()
    print(f'{text["judgement"]}: {band["title"]}')
    print(f'  {band["comment"]}')
    print()
    print(f'{text["strength"]}:')
    print(f"  {strength}")
    print()
    print(f'{text["suggestions"]}:')
    for index, suggestion in enumerate(suggestions, start=1):
        print(f"  {index}. {suggestion}")
    print()
    print(f'{text["category_tip"]}:')
    print(f"  {category_tip}")
    print()
    print(text["disclaimer"])
    print("=" * 68)

def wait_for_exit(language: str) -> None:
    text = TEXT[language]
    if msvcrt is not None:
        print(text["exit_prompt"])
        while True:
            key = msvcrt.getch()
            if key == b"\x1b":
                return
    input(text["exit_fallback"])
