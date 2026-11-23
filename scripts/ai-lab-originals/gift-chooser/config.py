from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = (
    PROJECT_ROOT
    / "data"
    / "training_data.json"
)

SEED = 42

INPUT_DIM = 14
HIDDEN_DIM = 8
OUTPUT_DIM = 1

LEARNING_RATE = 0.01
TRAIN_STEPS = 4000
NUM_FOLDS = 5