#!/usr/bin/env python3
"""
analyse.py
Zerak Benchmark — Results Analysis

Reads all CSV results from benchmark/results/ and produces:
  - Summary statistics tables (for paper Tables 1 and 2)
  - Figures 1–4 as PNG files
  - Failure case CSV
  - Ablation comparison table

Usage:
  python3 benchmark/scripts/analyse.py
  python3 benchmark/scripts/analyse.py --no-plots   # skip matplotlib (headless servers)
"""

import argparse
import os
import sys
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from scipy import stats

parser = argparse.ArgumentParser()
parser.add_argument('--no-plots', action='store_true')
args = parser.parse_args()

RESULTS_DIR = os.path.join(os.getcwd(), 'benchmark', 'results')
FIGURES_DIR = os.path.join(os.getcwd(), 'benchmark', 'figures')

os.makedirs(FIGURES_DIR, exist_ok=True)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def load(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        print(f"  ⚠  {filename} not found — skipping")
        return None
    return pd.read_csv(path)

def mean_std(series):
    return f"{series.mean():.3f} ± {series.std():.3f}"

def separator(title=''):
    print('\n' + '─' * 55)
    if title:
        print(title)

# ─── NLP Accuracy ─────────────────────────────────────────────────────────────

separator('Table 1 — NLP Accuracy by Complexity Tier')

nlp = load('nlp-accuracy.csv')
if nlp is not None:
    nlp = nlp[nlp['success'] == True]

    # Per-prompt statistics (across 5 runs)
    per_prompt = nlp.groupby(['prompt_id', 'complexity']).agg(
        node_f1_mean   =('node_f1', 'mean'),
        node_f1_std    =('node_f1', 'std'),
        edge_acc_mean  =('edge_accuracy', 'mean'),
        edge_acc_std   =('edge_accuracy', 'std'),
        var_acc_mean   =('var_accuracy', 'mean'),
        var_acc_std    =('var_accuracy', 'std'),
    ).reset_index()

    # Tier-level statistics
    tier = per_prompt.groupby('complexity').agg(
        f1_mean    =('node_f1_mean', 'mean'),
        f1_std     =('node_f1_mean', 'std'),
        edge_mean  =('edge_acc_mean', 'mean'),
        edge_std   =('edge_acc_mean', 'std'),
        var_mean   =('var_acc_mean', 'mean'),
        var_std    =('var_acc_mean', 'std'),
        n_prompts  =('prompt_id', 'count'),
    ).round(3)

    # Reorder tiers
    tier = tier.reindex(['easy', 'medium', 'hard'])

    print(f"\n{'Tier':<10} {'Node F1':>18} {'Edge Acc':>18} {'Var Acc':>18} {'n':>5}")
    print('-' * 72)
    for idx, row in tier.iterrows():
        print(f"{idx:<10} {row.f1_mean:.3f} ± {row.f1_std:.3f}   "
              f"{row.edge_mean:.3f} ± {row.edge_std:.3f}   "
              f"{row.var_mean:.3f} ± {row.var_std:.3f}   {int(row.n_prompts):>5}")

    overall_f1 = per_prompt['node_f1_mean'].mean()
    overall_std = per_prompt['node_f1_mean'].std()
    print(f"\n{'Overall':<10} {overall_f1:.3f} ± {overall_std:.3f}")
    target_met = '✓ meets target (≥0.80)' if overall_f1 >= 0.80 else '✗ below target (0.80)'
    print(f"           {target_met}")

    # Hypothesis H2 test: one-sample t-test vs 0.5 (random baseline)
    t_stat, p_val = stats.ttest_1samp(per_prompt['node_f1_mean'], popmean=0.5)
    print(f"\nH2 significance test: t={t_stat:.3f}, p={p_val:.4f}")
    print(f"  {'✓ Reject null (p < 0.05)' if p_val < 0.05 else '✗ Cannot reject null'}")

    # Failure cases
    failures = per_prompt[per_prompt['node_f1_mean'] < 0.6]
    if len(failures) > 0:
        print(f"\nLow-F1 cases (< 0.60): {len(failures)} prompts")
        failures_out = failures[['prompt_id', 'complexity', 'node_f1_mean', 'edge_acc_mean']].copy()
        failures_out.to_csv(os.path.join(RESULTS_DIR, 'failure-cases.csv'), index=False)
        print(f"  Saved to: benchmark/results/failure-cases.csv")

# ─── Validation Effectiveness ─────────────────────────────────────────────────

separator('Table 2 — Validation Effectiveness')

val = load('validation-effectiveness.csv')
if val is not None:
    invalid = val[val['category'] != 'valid_workflow']
    valid   = val[val['category'] == 'valid_workflow']

    recall    = invalid['caught'].mean()
    precision = invalid[invalid['caught']]['correct_error_type'].mean() if invalid['caught'].any() else 0
    fp_rate   = valid['false_positive'].mean() if len(valid) > 0 else 0

    print(f"\n{'Metric':<30} {'Value':>10}  {'Target':>12}  {'Status':>10}")
    print('-' * 66)
    print(f"{'Recall':<30} {recall*100:>9.1f}%  {'≥ 90%':>12}  {'✓' if recall >= 0.90 else '✗':>10}")
    print(f"{'Precision':<30} {precision*100:>9.1f}%  {'≥ 85%':>12}  {'✓' if precision >= 0.85 else '✗':>10}")
    print(f"{'False positive rate':<30} {fp_rate*100:>9.1f}%  {'≤ 5%':>12}  {'✓' if fp_rate <= 0.05 else '✗':>10}")

    print("\nPer-category recall:")
    cat_stats = invalid.groupby('category')['caught'].agg(['sum', 'count'])
    for cat, row in cat_stats.iterrows():
        pct = row['sum'] / row['count'] * 100
        bar = '█' * int(pct / 10) + '░' * (10 - int(pct / 10))
        print(f"  {cat:<35} {bar} {row['sum']:.0f}/{row['count']:.0f} ({pct:.0f}%)")

# ─── Token Efficiency ─────────────────────────────────────────────────────────

separator('Table 3 — Token Efficiency vs Baseline')

tok = load('token-efficiency.csv')
if tok is not None:
    by_tier = tok.groupby('complexity').agg(
        baseline_mean=('baseline_total_tokens', 'mean'),
        zerak_mean   =('zerak_total_tokens', 'mean'),
        reduction_mean=('reduction_pct', 'mean'),
        reduction_std =('reduction_pct', 'std'),
        latency_baseline=('latency_baseline_ms', 'mean'),
        latency_zerak   =('latency_zerak_ms', 'mean'),
    ).round(1)

    print(f"\n{'Tier':<10} {'Baseline':>10} {'Zerak':>10} {'Reduction':>18} {'Latency delta':>15}")
    print('-' * 66)
    for idx, row in by_tier.reindex(['easy', 'medium', 'hard']).iterrows():
        if pd.isna(row.baseline_mean):
            continue
        lat_delta = row.latency_baseline - row.latency_zerak
        print(f"{idx:<10} {row.baseline_mean:>10.0f} {row.zerak_mean:>10.0f} "
              f"{row.reduction_mean:>8.1f}% ± {row.reduction_std:.1f}%   "
              f"{lat_delta:>+10.0f}ms")

    overall_reduction = tok['reduction_pct'].mean()
    overall_std       = tok['reduction_pct'].std()
    print(f"\n{'Overall':<10} {'':>10} {'':>10} "
          f"{overall_reduction:>8.1f}% ± {overall_std:.1f}%")
    target_met = '✓ meets target (≥30%)' if overall_reduction >= 30 else '✗ below target (30%)'
    print(f"           {target_met}")

    # H4 significance test
    t_stat, p_val = stats.ttest_1samp(tok['reduction_pct'].dropna(), popmean=0)
    print(f"\nH4 significance test: t={t_stat:.3f}, p={p_val:.4f}")
    print(f"  {'✓ Significant reduction' if p_val < 0.05 else '✗ Not significant'}")

# ─── Ablation ─────────────────────────────────────────────────────────────────

separator('Table 4 — Ablation Study')

ablation_files = {
    'Full Zerak': 'nlp-accuracy.csv',
    'No validator': 'ablation-b.csv',
    'No optimizer': 'ablation-c.csv',
}

ablation_rows = []
for label, filename in ablation_files.items():
    df = load(filename)
    if df is None:
        continue
    df = df[df['success'] == True]
    row = {
        'config': label,
        'node_f1': df['node_f1'].mean(),
        'node_f1_std': df['node_f1'].std(),
        'success_rate': df['success'].mean() if 'success' in df else None,
        'avg_tokens': (df['tokens_input'] + df['tokens_output']).mean() if 'tokens_input' in df else None,
    }
    ablation_rows.append(row)

if ablation_rows:
    print(f"\n{'Config':<22} {'Node F1':>18} {'Avg Tokens':>12}")
    print('-' * 55)
    for row in ablation_rows:
        tokens_str = f"{row['avg_tokens']:.0f}" if row['avg_tokens'] else 'N/A'
        print(f"{row['config']:<22} {row['node_f1']:.3f} ± {row['node_f1_std']:.3f}   {tokens_str:>12}")

# ─── Figures ──────────────────────────────────────────────────────────────────

if not args.no_plots:
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches

        COLORS = {
            'easy':   '#639922',
            'medium': '#BA7517',
            'hard':   '#E24B4A',
            'node_f1': '#378ADD',
            'edge':    '#1D9E75',
            'var':     '#7F77DD',
        }

        # Figure 1 — NLP accuracy by tier
        if nlp is not None and len(per_prompt) > 0:
            fig, ax = plt.subplots(figsize=(8, 5))

            tiers  = ['easy', 'medium', 'hard']
            metric_keys = ['node_f1_mean', 'edge_acc_mean', 'var_acc_mean']
            metric_labels = ['Node F1', 'Edge accuracy', 'Variable accuracy']
            metric_colors = [COLORS['node_f1'], COLORS['edge'], COLORS['var']]

            x = np.arange(len(tiers))
            width = 0.25

            for i, (key, label, color) in enumerate(zip(metric_keys, metric_labels, metric_colors)):
                means = [per_prompt[per_prompt['complexity']==t][key].mean() for t in tiers]
                stds  = [per_prompt[per_prompt['complexity']==t][key].std() for t in tiers]
                ax.bar(x + i*width, means, width, label=label, color=color, alpha=0.85,
                       yerr=stds, capsize=3, error_kw={'linewidth': 1})

            ax.axhline(0.80, color='#E24B4A', linestyle='--', linewidth=1, label='Target (0.80)')
            ax.set_xlabel('Complexity tier')
            ax.set_ylabel('Score')
            ax.set_title('NLP to DAG accuracy by complexity tier', fontsize=12, pad=12)
            ax.set_xticks(x + width)
            ax.set_xticklabels(tiers)
            ax.set_ylim(0, 1.05)
            ax.legend(fontsize=9)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            plt.tight_layout()
            fig.savefig(os.path.join(FIGURES_DIR, 'fig1_nlp_accuracy.png'), dpi=150)
            plt.close()
            print(f"\n✓ Figure 1 saved: benchmark/figures/fig1_nlp_accuracy.png")

        # Figure 2 — Token efficiency
        if tok is not None and len(tok) > 0:
            fig, ax = plt.subplots(figsize=(8, 5))

            tiers = ['easy', 'medium', 'hard']
            x = np.arange(len(tiers))
            width = 0.35

            baseline_means = [tok[tok['complexity']==t]['baseline_total_tokens'].mean() for t in tiers]
            zerak_means    = [tok[tok['complexity']==t]['zerak_total_tokens'].mean() for t in tiers]

            bars1 = ax.bar(x - width/2, baseline_means, width, label='Baseline (raw Mistral)', color='#888780', alpha=0.8)
            bars2 = ax.bar(x + width/2, zerak_means,    width, label='Zerak optimized',       color=COLORS['node_f1'], alpha=0.85)

            # Annotate reduction %
            for i, (b, z) in enumerate(zip(baseline_means, zerak_means)):
                if b > 0:
                    reduction = (b - z) / b * 100
                    ax.annotate(f'-{reduction:.0f}%',
                                xy=(x[i] + width/2, z), xytext=(0, 5),
                                textcoords='offset points', ha='center', fontsize=9,
                                color='#185FA5')

            ax.set_xlabel('Complexity tier')
            ax.set_ylabel('Total tokens')
            ax.set_title('Token consumption: Zerak vs raw baseline', fontsize=12, pad=12)
            ax.set_xticks(x)
            ax.set_xticklabels(tiers)
            ax.legend(fontsize=9)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            plt.tight_layout()
            fig.savefig(os.path.join(FIGURES_DIR, 'fig2_token_efficiency.png'), dpi=150)
            plt.close()
            print(f"✓ Figure 2 saved: benchmark/figures/fig2_token_efficiency.png")

        print('\nAll figures saved to: benchmark/figures/')

    except ImportError:
        print('\n⚠  matplotlib not installed. Skipping figures.')
        print('   Install with: pip install matplotlib')

# ─── Final check ──────────────────────────────────────────────────────────────

separator('Final hypothesis verdicts')
print()
checks = []
if nlp is not None and len(per_prompt) > 0:
    f1 = per_prompt['node_f1_mean'].mean()
    checks.append(('H2 — Node F1 ≥ 0.80', f1 >= 0.80, f'F1 = {f1:.3f}'))
if val is not None and len(invalid) > 0:
    checks.append(('H3 — Validation recall ≥ 0.90', recall >= 0.90, f'Recall = {recall:.3f}'))
if tok is not None:
    red = tok['reduction_pct'].mean()
    checks.append(('H4 — Token reduction ≥ 30%', red >= 30, f'Reduction = {red:.1f}%'))

for label, passed, detail in checks:
    icon = '✓' if passed else '✗'
    print(f"  {icon} {label}  ({detail})")

print('\nNote: H1 (TTW comparison) requires human study data — run sus-calculator.ts')
print('Analysis complete.')
