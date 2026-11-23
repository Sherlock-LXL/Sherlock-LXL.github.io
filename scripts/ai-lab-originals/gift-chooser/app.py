from pathlib import Path
import numpy as np

from src.model import load_model, predict
from src.ui import (
    collect_input,
    show_splash,
    show_result,
    wait_for_exit,
)

MODEL_PATH = (
    Path(__file__).resolve().parent
    / "models"
    / "final_model.npz"
)

def main() -> None:
    show_splash()
    parameters = load_model(MODEL_PATH)
    input_data, language = collect_input()
    prediction = predict(
        input_data,
        parameters,
    )
    raw_score = float(prediction[0, 0])
    display_score = float(
        np.clip(raw_score, 0.0, 1.0) * 10
    )
    show_result(
        display_score=display_score,
        input_data=input_data,
        language=language,
    )
    wait_for_exit(language)

if __name__ == "__main__":
    main()
