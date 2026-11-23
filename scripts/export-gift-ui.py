"""提取原 Gift Chooser 的界面文字，不执行原程序。"""

import ast
import json
from pathlib import Path
import sys

source = Path(sys.argv[1])
names = {
    "SCORE_QUESTIONS",
    "CATEGORIES",
    "SCORE_BANDS",
    "FEATURE_FEEDBACK",
    "CATEGORY_TIPS",
    "RESULT_TEXT",
}
values = {}
for statement in ast.parse(source.read_text(encoding="utf-8")).body:
    if isinstance(statement, ast.Assign):
        for target in statement.targets:
            if isinstance(target, ast.Name) and target.id in names:
                values[target.id] = ast.literal_eval(statement.value)["zh"]
assert set(values) == names
destination = Path(__file__).resolve().parents[1] / "shared/original-gift-ui.json"
destination.write_text(json.dumps(values, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(destination)
