"""Run locally from backend/: python -m app.ml.train."""
import json
from .model import train

if __name__ == '__main__':
    result = train()
    print(json.dumps({key: result[key] for key in ('model_id', 'reference_period', 'evaluation_period', 'observations', 'data_quality', 'evaluation')}, ensure_ascii=False, indent=2))
