---
name: wxo-adk-csv-analyzer
description: >
  Builds, configures, and tests watsonx Orchestrate (wxO) ADK agents with CSV analysis tools and workflows.
  Use when creating or extending watsonx Orchestrate agents that ingest, parse, validate, and analyze CSV datasets.
metadata:
  argument-hint: "[agent-name or csv-task-description]"
---

# watsonx Orchestrate ADK — CSV Analyzer Agent Builder

## Purpose
Provides procedural guidance and scaffolding for creating an enterprise agent using the IBM watsonx Orchestrate Agent Development Kit (ADK) that ingests, queries, and analyzes CSV tabular data.

## Workflow

### 1. Initialize ADK Environment & Agent Spec
1. Ensure the ADK CLI is available:
   ```bash
   pip install ibm-watsonx-orchestrate-adk pandas pydantic
   ```
2. Initialize or structure the agent configuration file (`agent.yaml`):
   ```yaml
   name: csv-analytics-agent
   description: "Agent for analyzing CSV datasets, generating statistical summaries, and filtering records."
   framework: "adk"
   tools:
     - name: analyze_csv
       type: python
       handler: "tools.csv_tools.analyze_csv"
     - name: query_csv
       type: python
       handler: "tools.csv_tools.query_csv"
   ```

### 2. Implement CSV Processing & Analysis Tools
Create deterministic, secure tool handlers (`tools/csv_tools.py`):
```python
import pandas as pd
from typing import Dict, Any, List

def analyze_csv(file_path: str) -> Dict[str, Any]:
    """Reads a CSV and generates summary statistics, columns, and row counts."""
    df = pd.read_csv(file_path)
    return {
        "columns": list(df.columns),
        "total_rows": len(df),
        "summary": df.describe(include='all').to_dict(),
        "missing_values": df.isnull().sum().to_dict()
    }

def query_csv(file_path: str, column: str, filter_value: Any) -> List[Dict[str, Any]]:
    """Filters CSV records by column matching."""
    df = pd.read_csv(file_path)
    filtered = df[df[column] == filter_value]
    return filtered.head(50).to_dict(orient="records")
```

### 3. Validate & Package for Orchestrate
1. Test tool execution locally:
   ```bash
   python -c "from tools.csv_tools import analyze_csv; print(analyze_csv('sample.csv'))"
   ```
2. Validate with watsonx Orchestrate ADK linter / builder.
3. Export skill package for catalog deployment if deploying to cloud instance.
