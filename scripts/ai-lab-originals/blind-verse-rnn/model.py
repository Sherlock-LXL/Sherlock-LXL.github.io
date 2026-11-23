import torch
import torch.nn as nn


class PoetryLSTM(nn.Module):
    def __init__(
        self,
        vocab_size,
        embedding_dim=128,
        hidden_size=256,
        num_layers=2,
        dropout=0.1,
    ):
        super().__init__()
        self.embedding = nn.Embedding(
            num_embeddings=vocab_size,
            embedding_dim=embedding_dim,
            padding_idx=0,
        )
        self.lstm = nn.LSTM(
            input_size=embedding_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )
        self.fc = nn.Linear(
            hidden_size,
            vocab_size,
        )
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, hidden=None):
        x = self.embedding(x)
        x = self.dropout(x)
        output, hidden = self.lstm(x, hidden)
        output = self.dropout(output)
        logits = self.fc(output)
        return logits, hidden
