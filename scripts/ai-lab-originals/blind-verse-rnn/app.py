from pathlib import Path
import json
import html
import streamlit as st
import streamlit.components.v1 as components
import torch

from src.model import PoetryLSTM

PROJECT_ROOT = Path(__file__).resolve().parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
CHECKPOINT_DIR = PROJECT_ROOT / "checkpoints"
VOCAB_PATH = PROCESSED_DIR / "vocab_benchmark.json"
MODEL_PATH = CHECKPOINT_DIR / "best_finetuned_model.pth"

GENERATION_MODES = {
    "稳健": {
        "temperature": 0.55,
        "top_k": 5,
        "description": "更稳定、自然，偏向常见表达",
    },
    "适中": {
        "temperature": 0.70,
        "top_k": 15,
        "description": "在自然和意外之间取得平衡",
    },
    "激进": {
        "temperature": 0.90,
        "top_k": 30,
        "description": "更自由、更偶然，也更容易出现惊喜",
    },
}

MAX_LENGTH = 30
MAX_PREFIX_LENGTH = 3
MAX_CONTINUATION_LENGTH = 20

st.set_page_config(
    page_title="双盲诗生成器",
    page_icon="🌙",
    layout="centered",
)

st.markdown(
    """
    <style>

    .block-container {
        max-width: 900px;
        padding-top: 3rem;
        padding-bottom: 4rem;
    }

    .main-title {
        font-size: 2.6rem;
        font-weight: 750;
        margin-bottom: 0.4rem;
        letter-spacing: -0.04em;
    }

    .subtitle {
        color: #888888;
        font-size: 0.95rem;
        margin-bottom: 2rem;
    }

    .section-title {
        font-size: 1.65rem;
        font-weight: 700;
        margin-top: 0.2rem;
        margin-bottom: 0.3rem;
    }

    .section-description {
        color: #888888;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }

    .mode-info {
        color: #888888;
        font-size: 0.85rem;
        margin-top: -0.5rem;
        margin-bottom: 1rem;
    }

    .poem-card {
        padding: 1.2rem 1.4rem;
        margin-top: 1rem;
        margin-bottom: 1rem;
        border: 1px solid #eeeeee;
        border-radius: 14px;
        background: #fafafa;
    }

    .poem-line {
        font-size: 1.55rem;
        font-weight: 650;
        line-height: 1.8;
    }

    .continuation-card {
        padding: 1.2rem 1.4rem;
        margin-top: 1rem;
        margin-bottom: 1rem;
        border: 1px solid #eeeeee;
        border-radius: 14px;
        background: #fafafa;
    }

    div[data-testid="stButton"] button {
        border-radius: 10px;
        min-height: 42px;
    }

    div[data-testid="stTextInput"] input {
        border-radius: 10px;
    }

    hr {
        margin-top: 2.2rem !important;
        margin-bottom: 2.2rem !important;
    }

    </style>
    """,
    unsafe_allow_html=True,
)

if "line_a" not in st.session_state:
    st.session_state.line_a = ""
if "line_b" not in st.session_state:
    st.session_state.line_b = ""
if "favorites" not in st.session_state:
    st.session_state.favorites = []
if "continuation" not in st.session_state:
    st.session_state.continuation = ""

@st.cache_resource
def load_model():
    with open(VOCAB_PATH, "r", encoding="utf-8") as f:
        char_to_idx = json.load(f)
    vocab_size = len(char_to_idx)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = PoetryLSTM(
        vocab_size=vocab_size,
        embedding_dim=1536,
        hidden_size=1536,
        num_layers=1,
        dropout=0.1,
    ).to(device)
    model.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location=device,
            weights_only=True,
        )
    )
    model.eval()
    idx_to_char = {
        idx: char
        for char, idx in char_to_idx.items()
    }
    return model, char_to_idx, idx_to_char, device

model, char_to_idx, idx_to_char, device = load_model()
vocab_size = len(char_to_idx)
pad_id = char_to_idx["<PAD>"]
bos_id = char_to_idx["<BOS>"]
eos_id = char_to_idx["<EOS>"]
unk_id = char_to_idx["<UNK>"]

def sample_next_token(
    next_logits,
    temperature,
    top_k,
):
    next_logits = next_logits / temperature
    next_logits[pad_id] = -float("inf")
    next_logits[bos_id] = -float("inf")
    next_logits[unk_id] = -float("inf")
    top_logits, top_indices = torch.topk(next_logits, k=min(top_k, vocab_size))
    probabilities = torch.softmax(top_logits, dim=-1)
    sampled_index = torch.multinomial(probabilities, num_samples=1).item()
    return top_indices[sampled_index].item()

def generate_line(
    temperature,
    top_k,
    max_length=MAX_LENGTH,
):
    token_id = bos_id
    hidden = None
    generated_chars = []
    with torch.no_grad():
        for _ in range(max_length):
            x = torch.tensor(
                [[token_id]],
                dtype=torch.long,
                device=device,
            )
            logits, hidden = model(x, hidden)
            next_id = sample_next_token(
                logits[0, -1],
                temperature,
                top_k,
            )
            if next_id == eos_id:
                break
            generated_chars.append(idx_to_char[next_id])
            token_id = next_id
    return "".join(generated_chars)

def generate_blind_verse(mode):
    settings = GENERATION_MODES[mode]
    line_a = generate_line(temperature=settings["temperature"], top_k=settings["top_k"])
    line_b = generate_line(temperature=settings["temperature"], top_k=settings["top_k"])
    return line_a, line_b

def continue_text(
    prefix,
    temperature,
    top_k,
    max_new_tokens=MAX_CONTINUATION_LENGTH,
):
    prefix_ids = []
    for char in prefix:
        token_id = char_to_idx.get(char)
        if token_id is None:
            return None
        prefix_ids.append(token_id)
    input_ids = [bos_id, *prefix_ids,]
    x = torch.tensor(
        [input_ids],
        dtype=torch.long,
        device=device,
    )
    generated_chars = []
    with torch.no_grad():
        logits, hidden = model(x)
        next_logits = logits[0, -1]
        for _ in range(max_new_tokens):
            next_id = sample_next_token(
                next_logits,
                temperature,
                top_k,
            )
            if next_id == eos_id:
                break
            generated_chars.append(idx_to_char[next_id])
            x = torch.tensor(
                [[next_id]],
                dtype=torch.long,
                device=device,
            )
            logits, hidden = model(x, hidden)
            next_logits = logits[0, -1]
    return prefix + "".join(generated_chars)

def is_favorite(line):
    return (bool(line) and line in st.session_state.favorites)

def toggle_favorite(line):
    if not line:
        return
    if line in st.session_state.favorites:
        st.session_state.favorites.remove(line)
    else:
        st.session_state.favorites.append(line)

def copy_button(text, label="复制",):
    text_json = json.dumps(text, ensure_ascii=False)
    label_json = json.dumps(label, ensure_ascii=False)
    components.html(
        f"""
        <html>
        <head>
        <style>

        body {{
            margin: 0;
            padding: 4px 0 8px 0;
            background: transparent;
        }}

        button {{
            width: 100%;
            height: 42px;

            box-sizing: border-box;

            border: 1px solid #d8d8d8;
            border-radius: 10px;

            background: white;

            color: #222222;
            font-size: 14px;

            cursor: pointer;

            transition:
                background 0.15s ease,
                border-color 0.15s ease;
        }}

        button:hover {{
            background: #f7f7f7;
            border-color: #bbbbbb;
        }}

        </style>
        </head>

        <body>

        <button
            id="copyButton"
            onclick='copyText()'
        >
        {label}
        </button>

        <script>

        function copyText() {{

            navigator.clipboard.writeText(
                {text_json}
            );

            const button =
                document.getElementById(
                    "copyButton"
                );

            button.innerText =
                "已复制 ✓";

            setTimeout(
                () => {{
                    button.innerText =
                        {label_json};
                }},
                1500
            );
        }}

        </script>

        </body>
        </html>
        """,
        height=58,
    )

st.markdown('<div class="main-title">双盲诗生成器</div>', unsafe_allow_html=True)
st.markdown(
    """
    <div class="subtitle">
    两句诗彼此不可见，
    在偶然中寻找意义。
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="section-title">双盲诗</div>', unsafe_allow_html=True)
st.markdown(
    """
    <div class="section-description">
    同一个模型独立写下两句诗，
    第二句不知道第一句写了什么。
    </div>
    """,
    unsafe_allow_html=True,
)

blind_mode = st.radio(
    "双盲诗生成模式",
    options=[
        "稳健",
        "适中",
        "激进",
    ],
    index=1,
    horizontal=True,
    key="blind_mode",
)
blind_settings = GENERATION_MODES[
    blind_mode
]

st.markdown(
    f"""
    <div class="mode-info">
    {blind_settings["description"]}
    · Temperature = {blind_settings["temperature"]}
    · Top-k = {blind_settings["top_k"]}
    </div>
    """,
    unsafe_allow_html=True,
)

if st.button(
    "生成双盲诗",
    type="primary",
    use_container_width=True,
    key="generate_blind",
):
    line_a, line_b = generate_blind_verse(blind_mode)
    st.session_state.line_a = line_a
    st.session_state.line_b = line_b

if (st.session_state.line_a or st.session_state.line_b):
    line_a = (st.session_state.line_a or "……")
    line_b = (st.session_state.line_b or "……")
    safe_line_a = html.escape(line_a)
    safe_line_b = html.escape(line_b)
    st.markdown(
        (
            '<div class="poem-card">'
            f'<div class="poem-line">{safe_line_a}</div>'
            f'<div class="poem-line">{safe_line_b}</div>'
            '</div>'
        ),
        unsafe_allow_html=True,
    )

    col_a, col_b = st.columns(2)
    favorite_a = is_favorite(st.session_state.line_a)
    favorite_b = is_favorite(st.session_state.line_b)

    with col_a:
        st.button(
            (
                "♥ 已收藏第一句"
                if favorite_a
                else "♡ 收藏第一句"
            ),
            type=(
                "primary"
                if favorite_a
                else "secondary"
            ),
            use_container_width=True,
            key="favorite_a",
            on_click=toggle_favorite,
            args=(st.session_state.line_a,),
        )

    with col_b:
        st.button(
            (
                "♥ 已收藏第二句"
                if favorite_b
                else "♡ 收藏第二句"
            ),
            type=(
                "primary"
                if favorite_b
                else "secondary"
            ),
            use_container_width=True,
            key="favorite_b",
            on_click=toggle_favorite,
            args=(st.session_state.line_b,),
        )

    poem_text = (
        f"{line_a}\n"
        f"{line_b}"
    )

    copy_button(
        poem_text,
        "复制整组诗",
    )

st.divider()
st.markdown(
    '<div class="section-title">诗句续写</div>',
    unsafe_allow_html=True,
)
st.markdown(
    """
    <div class="section-description">
    给模型一个很短的开头，
    让它继续写下去。
    </div>
    """,
    unsafe_allow_html=True,
)

continuation_mode = st.radio(
    "续写模式",
    options=[
        "稳健",
        "适中",
        "激进",
    ],
    index=1,
    horizontal=True,
    key="continuation_mode",
)
continuation_settings = GENERATION_MODES[continuation_mode]
st.markdown(
    f"""
    <div class="mode-info">
    {continuation_settings["description"]}
    · Temperature = {continuation_settings["temperature"]}
    · Top-k = {continuation_settings["top_k"]}
    </div>
    """,
    unsafe_allow_html=True,
)

prefix = st.text_input(
    "输入 1～3 个字",
    placeholder="例如：月光、春天、如果",
    key="prefix_input",
)

if st.button(
    "开始续写",
    type="primary",
    use_container_width=True,
    key="continue_button",
):
    prefix = prefix.strip()
    if not prefix:
        st.warning("请输入 1～3 个字。")
    elif len(prefix) > MAX_PREFIX_LENGTH:
        st.warning("开头最多输入 3 个字。")
    else:
        result = continue_text(
            prefix=prefix,
            temperature=continuation_settings["temperature"],
            top_k=continuation_settings["top_k"],
        )
        if result is None:
            st.warning("输入中包含模型词表里没有的字符，换几个常见汉字试试。")
        else:
            st.session_state.continuation = result

if st.session_state.continuation:
    continuation = (st.session_state.continuation)
    safe_continuation = html.escape(continuation)
    st.markdown(
        (
            '<div class="continuation-card">'
            '<div class="poem-line">'
            f'{safe_continuation}'
            '</div>'
            '</div>'
        ),
        unsafe_allow_html=True,
    )
    col_favorite, col_copy = st.columns(2)
    continuation_favorite = is_favorite(continuation)
    with col_favorite:
        st.button(
            (
                "♥ 已收藏"
                if continuation_favorite
                else "♡ 收藏续写"
            ),
            type=(
                "primary"
                if continuation_favorite
                else "secondary"
            ),
            use_container_width=True,
            key="favorite_continuation",
            on_click=toggle_favorite,
            args=(continuation,),
        )
    with col_copy:
        copy_button(continuation, "复制续写")

st.divider()
with st.expander(f"♡ 我的收藏  ·  {len(st.session_state.favorites)}"):
    if not st.session_state.favorites:
        st.caption("还没有收藏的句子。")
    else:
        for i, line in enumerate(st.session_state.favorites):
            col_text, col_remove = (st.columns([5, 1]))
            with col_text:
                st.markdown(f"**{i + 1}.** {line}")
            with col_remove:
                if st.button("删除", key=f"remove_{i}"):
                    st.session_state.favorites.pop(i)
                    st.rerun()
        st.write("")
        if st.button("清空收藏", use_container_width=True,):
            st.session_state.favorites = []
            st.rerun()

st.divider()
st.caption("Blind Verse · LSTM Poetry Generator")