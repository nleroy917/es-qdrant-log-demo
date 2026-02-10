import json

import polars as pl
import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt

from plotly.subplots import make_subplots

# helper to read JSONL data into a list of dicts
def load_jsonl(filepath):
    data = []
    with open(filepath, 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return data

# load data
data = load_jsonl('results/2026-02-10T14-29-48/elasticsearch.jsonl')
df = pl.DataFrame(data)
df = df.with_columns(pl.col('timestamp').str.to_datetime(time_zone='UTC'))

# create plots
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: QPS over time
axes[0, 0].plot(df['timestamp'], df['qps'], marker='o')
axes[0, 0].set_title('QPS Over Time')
axes[0, 0].set_xlabel('Timestamp')
axes[0, 0].set_ylabel('QPS')
axes[0, 0].grid(True)

# Plot 2: Mean latency over time
axes[0, 1].plot(df['timestamp'], df['latency'].list.get(0), marker='o', color='orange')
axes[0, 1].set_title('Mean Latency Over Time')
axes[0, 1].set_xlabel('Timestamp')
axes[0, 1].set_ylabel('Latency (microseconds)')
axes[0, 1].grid(True)

# Plot 3: Success vs Failure count
axes[1, 0].plot(df['timestamp'], df['success_count'], label='Success', marker='o')
axes[1, 0].plot(df['timestamp'], df['failure_count'], label='Failure', marker='o')
axes[1, 0].set_title('Success vs Failure Counts')
axes[1, 0].set_xlabel('Timestamp')
axes[1, 0].set_ylabel('Count')
axes[1, 0].legend()
axes[1, 0].grid(True)

# Plot 4: Latency percentiles
axes[1, 1].plot(df['timestamp'], df['latency'].list.get(2), label='p50', marker='o')
axes[1, 1].plot(df['timestamp'], df['latency'].list.get(3), label='p95', marker='o')
axes[1, 1].plot(df['timestamp'], df['latency'].list.get(4), label='p99', marker='o')
axes[1, 1].set_title('Latency Percentiles Over Time')
axes[1, 1].set_xlabel('Timestamp')
axes[1, 1].set_ylabel('Latency (microseconds)')
axes[1, 1].legend()
axes[1, 1].grid(True)

plt.tight_layout()
plt.savefig('analysis.png')

# Create subplots with Plotly
fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=('QPS Over Time', 'Mean Latency Over Time', 
                    'Success vs Failure Counts', 'Latency Percentiles Over Time')
)

# Plot 1: QPS over time
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['qps'], mode='lines+markers', name='QPS'),
    row=1, col=1
)

# Plot 2: Mean latency over time
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['latency'].list.get(0), 
               mode='lines+markers', name='Mean Latency'),
    row=1, col=2
)

# Plot 3: Success vs Failure count
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['success_count'], mode='lines+markers', name='Success'),
    row=2, col=1
)
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['failure_count'], mode='lines+markers', name='Failure'),
    row=2, col=1
)

# Plot 4: Latency percentiles
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['latency'].list.get(2), mode='lines+markers', name='p50'),
    row=2, col=2
)
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['latency'].list.get(3), mode='lines+markers', name='p95'),
    row=2, col=2
)
fig.add_trace(
    go.Scatter(x=df['timestamp'], y=df['latency'].list.get(4), mode='lines+markers', name='p99'),
    row=2, col=2
)

# Update layout
fig.update_layout(
    template='plotly_white',
    font=dict(family='Arial, sans-serif', size=11),
    showlegend=True,
    height=800,
    width=1200,
    plot_bgcolor='white',
    paper_bgcolor='white',
    hovermode='x unified'
)

fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='lightgray')
fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='lightgray')

fig.write_html('analysis.html')
