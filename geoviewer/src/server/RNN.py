import torch
import torch.nn as nn
import torch.nn.functional as F

class RNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size, num_layers):
        super(RNN, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.rnn = nn.RNN(input_size, hidden_size, num_layers, batch_first=True)
        self.fc1 = nn.Linear(hidden_size, 64)
        self.fc2 = nn.Linear(64, output_size)
    
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
        out, _ = self.rnn(x, h0)
        out = F.relu(self.fc1(out[:, -1, :]))
        out1 = self.fc2(out)

        out2 = torch.max(out1, dim=1).values.unsqueeze(1)
        out3 = torch.min(out1, dim=1).values.unsqueeze(1)
        out4 = torch.mean(out1, dim=1).unsqueeze(1)

        return torch.cat((out2, out3, out4), dim=1)