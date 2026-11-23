from pathlib import Path
import numpy as np

from .config import (
    SEED,
    INPUT_DIM,
    HIDDEN_DIM,
    OUTPUT_DIM,
    LEARNING_RATE,
    TRAIN_STEPS,
)

def initialize_parameters(
    input_dim: int,
    hidden_dim: int,
    output_dim: int,
    seed: int,
) -> dict[str, np.ndarray]:
    rng = np.random.default_rng(seed)
    W1 = rng.normal(size=(input_dim, hidden_dim)) * np.sqrt(2 / input_dim)
    b1 = np.zeros((hidden_dim,))
    W2 = rng.normal(size=(hidden_dim, output_dim)) * np.sqrt(2 / hidden_dim)
    b2 = np.zeros((output_dim,))
    parameters = {
        "W1": W1,
        "b1": b1,
        "W2": W2,
        "b2": b2,
    }
    return parameters

def linear_forward(
    x: np.ndarray,
    weight: np.ndarray,
    bias: np.ndarray
) -> np.ndarray:
    return x @ weight + bias

def relu_forward(x: np.ndarray) -> np.ndarray:
    return np.maximum(0, x)

def forward(
    X: np.ndarray,
    parameters: dict[str, np.ndarray],
) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    Z1 = linear_forward(X, parameters["W1"], parameters["b1"])
    H1 = relu_forward(Z1)
    S = linear_forward(H1, parameters["W2"], parameters["b2"])
    cache = {
        "X": X,
        "Z1": Z1,
        "H1": H1,
    }
    return S, cache
    
def mse_loss(
    prediction: np.ndarray,
    target: np.ndarray,
) -> float:
    if prediction.shape != target.shape:
        raise ValueError(f"Shape mismatch: {prediction.shape} != {target.shape}")
    total_loss = 0.0
    rows, cols = prediction.shape
    for i in range(rows):
        for j in range(cols):
            total_loss += (prediction[i, j] - target[i, j]) ** 2
    return total_loss / prediction.size

def backward(
    prediction: np.ndarray,
    target: np.ndarray,
    cache: dict[str, np.ndarray],
    parameters: dict[str, np.ndarray],
) -> dict[str, np.ndarray]:
    grad_S = 2 * (prediction - target) / prediction.size
    grad_b2 = grad_S.sum(axis=0)
    grad_H1 = grad_S @ parameters["W2"].T
    grad_W2 = cache["H1"].T @ grad_S
    grad_Z1 = grad_H1 * (cache["Z1"] > 0)
    grad_b1 = grad_Z1.sum(axis=0)
    grad_W1 = cache["X"].T @ grad_Z1
    gradients = {
        "W1": grad_W1,
        "b1": grad_b1,
        "W2": grad_W2,
        "b2": grad_b2,
    }
    return gradients

def train(
    X: np.ndarray,
    y: np.ndarray,
    steps: int = TRAIN_STEPS,
    learning_rate: float = LEARNING_RATE,
    seed: int = SEED,
    print_every: int | None = None,
) -> tuple[dict[str, np.ndarray], list[float]]:
    if X.ndim != 2:
        raise ValueError("X must be a 2D array.")
    if y.ndim != 2 or y.shape[1] != OUTPUT_DIM:
        raise ValueError(f"y must have shape (N, {OUTPUT_DIM}).")
    if X.shape[0] != y.shape[0]:
        raise ValueError("X and y must contain the same number of samples.")
    if X.shape[1] != INPUT_DIM:
        raise ValueError(
            f"X must have {INPUT_DIM} features, got {X.shape[1]}."
        )    
    parameters = initialize_parameters(INPUT_DIM, HIDDEN_DIM, OUTPUT_DIM, seed)
    loss_history = []
    for step in range(steps):
        prediction, cache = forward(X, parameters)
        current_loss = mse_loss(prediction, y)
        loss_history.append(current_loss)
        gradients = backward(prediction, y, cache, parameters)
        parameters["W1"] -= learning_rate * gradients["W1"]
        parameters["b1"] -= learning_rate * gradients["b1"]
        parameters["W2"] -= learning_rate * gradients["W2"]
        parameters["b2"] -= learning_rate * gradients["b2"]
        if print_every is not None and (step + 1) % print_every == 0:
            print(f"Step: {step + 1}, Loss: {current_loss}")
    return parameters, loss_history

def predict(
    X: np.ndarray,
    parameters: dict[str, np.ndarray],
) -> np.ndarray:
    prediction, _ = forward(X, parameters)
    return prediction

def save_model(
    parameters: dict[str, np.ndarray],
    file_path: str | Path,
) -> None:
    required_keys = {"W1", "b1", "W2", "b2"}
    missing_keys = required_keys - parameters.keys()
    if missing_keys:
        raise ValueError(
            f"Missing model parameters: {sorted(missing_keys)}"
        )
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        path,
        W1=parameters["W1"],
        b1=parameters["b1"],
        W2=parameters["W2"],
        b2=parameters["b2"],
    )

def load_model(
    file_path: str | Path,
) -> dict[str, np.ndarray]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Model file not found: {path}"
        )
    required_keys = {"W1", "b1", "W2", "b2"}
    with np.load(path) as saved_data:
        saved_keys = set(saved_data.files)
        missing_keys = required_keys - saved_keys
        if missing_keys:
            raise ValueError(
                f"Model file is missing parameters: {sorted(missing_keys)}"
            )
        parameters = {
            "W1": saved_data["W1"].copy(),
            "b1": saved_data["b1"].copy(),
            "W2": saved_data["W2"].copy(),
            "b2": saved_data["b2"].copy(),
        }
    expected_shapes = {
        "W1": (INPUT_DIM, HIDDEN_DIM),
        "b1": (HIDDEN_DIM,),
        "W2": (HIDDEN_DIM, OUTPUT_DIM),
        "b2": (OUTPUT_DIM,),
    }
    for name, expected_shape in expected_shapes.items():
        actual_shape = parameters[name].shape
        if actual_shape != expected_shape:
            raise ValueError(
                f"{name} has shape {actual_shape}, "
                f"expected {expected_shape}."
            )
    return parameters