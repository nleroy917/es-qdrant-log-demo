import json

import polars as pl
import plotly.graph_objects as go
from plotly.subplots import make_subplots

RESULTS_DIR = 'results/2026-02-10T15-33-09'

# NPG (Nature Publishing Group) palette
COLORS = {
    'Elasticsearch': '#E64B35',
    'Qdrant': '#4DBBD5',
}


def load_jsonl(filepath):
    with open(filepath, 'r') as f:
        return [json.loads(line) for line in f]


def load_backend(results_dir, name):
    data = load_jsonl(f'{results_dir}/{name}.jsonl')
    df = pl.DataFrame(data)
    df = df.with_columns(pl.col('timestamp').str.to_datetime(time_zone='UTC'))
    df = df.unnest('latency')
    # μs → ms
    us_cols = [c for c in df.columns if c.endswith('_us')]
    df = df.with_columns([
        (pl.col(c) / 1000).alias(c.replace('_us', '_ms'))
        for c in us_cols
    ])
    return df


# load both backends and align to a common t=0
backends = {
    'Elasticsearch': load_backend(RESULTS_DIR, 'elasticsearch'),
    'Qdrant': load_backend(RESULTS_DIR, 'qdrant'),
}
t0 = min(df['timestamp'].min() for df in backends.values())
for name in backends:
    backends[name] = backends[name].with_columns(
        ((pl.col('timestamp') - t0).dt.total_milliseconds() / 1000).alias('elapsed_s')
    )

# panels: QPS, Mean Latency, p95, p99
fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=(
        '<b>a</b>  QPS',
        '<b>b</b>  Mean latency',
        '<b>c</b>  p95 latency',
        '<b>d</b>  p99 latency',
    ),
    horizontal_spacing=0.10,
    vertical_spacing=0.15,
)

panels = [
    (1, 1, 'qps'),
    (1, 2, 'mean_ms'),
    (2, 1, 'p95_ms'),
    (2, 2, 'p99_ms'),
]

for name, df in backends.items():
    color = COLORS[name]
    for i, (row, col, y_col) in enumerate(panels):
        fig.add_trace(go.Scatter(
            x=df['elapsed_s'], y=df[y_col],
            mode='lines', name=name,
            line=dict(color=color, width=1.5),
            legendgroup=name,
            showlegend=(i == 0),
        ), row=row, col=col)

# axis labels
fig.update_yaxes(title_text='queries s<sup>-1</sup>', type='log', row=1, col=1)
fig.update_yaxes(title_text='ms', row=1, col=2)
fig.update_yaxes(title_text='ms', row=2, col=1)
fig.update_yaxes(title_text='ms', row=2, col=2)
for col in (1, 2):
    fig.update_xaxes(title_text='Time (s)', row=2, col=col)

# Nature style
fig.update_layout(
    font=dict(family='Arial', size=12),
    plot_bgcolor='white',
    paper_bgcolor='white',
    width=900,
    height=650,
    margin=dict(t=40, b=50, l=60, r=20),
    legend=dict(
        orientation='h',
        yanchor='bottom', y=1.04,
        xanchor='center', x=0.5,
        font=dict(size=11),
    ),
    hovermode='x unified',
)

fig.update_xaxes(
    showgrid=False,
    showline=True, linewidth=1, linecolor='black',
    ticks='outside', ticklen=4, tickwidth=1, tickcolor='black',
)
fig.update_yaxes(
    showgrid=False,
    showline=True, linewidth=1, linecolor='black',
    ticks='outside', ticklen=4, tickwidth=1, tickcolor='black',
)

# bold the panel labels (plotly stores subplot_titles as annotations)
for ann in fig.layout.annotations:
    ann.font = dict(family='Arial', size=13)
    ann.xanchor = 'left'
    ann.x = ann.x - 0.04

fig.show()