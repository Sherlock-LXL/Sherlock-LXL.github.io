from torch import nn

class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.main = nn.Sequential(
            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                stride=1,
                padding=1,
                bias=False,
            ),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.Conv2d(
                out_channels,
                out_channels,
                kernel_size=3,
                stride=1,
                padding=1,
                bias=False,
            ),
            nn.BatchNorm2d(out_channels),
        )
        if in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(
                    in_channels,
                    out_channels,
                    kernel_size=1,
                    stride=1,
                    bias=False,
                ),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.shortcut = nn.Identity()
        self.relu = nn.ReLU()

    def forward(self, x):
        out = self.main(x)
        identity = self.shortcut(x)
        out = out + identity
        out = self.relu(out)
        return out

class NeuralNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.network = nn.Sequential(
            ResidualBlock(1, 16),
            nn.MaxPool2d(kernel_size=2, stride=2),
            ResidualBlock(16, 32),
            nn.MaxPool2d(kernel_size=2, stride=2),
            ResidualBlock(32, 64),
            nn.MaxPool2d(kernel_size=2, stride=2),
            ResidualBlock(64, 128),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Flatten(),
            nn.Linear(1152, 128),
            nn.ReLU(),
            nn.Linear(128, 7),
        )

    def forward(self, x):
        return self.network(x)