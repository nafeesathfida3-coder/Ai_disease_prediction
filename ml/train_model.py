from pathlib import Path
import json
import pickle
import re

import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.linear_model import LogisticRegression


ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / 'disease' / 'Original_Dataset.csv'
OUT = Path(__file__).resolve().parent


df = pd.read_csv(DATA)

symptom_cols = [
    c for c in df.columns
    if c.lower().startswith('symptom_')
]


def normalize(symptom):
    symptom = str(symptom).strip().lower()

    # Remove spaces around underscores:
    # "dischromic _patches" -> "dischromic_patches"
    symptom = re.sub(r'\s*_\s*', '_', symptom)

    # Convert spaces to underscores:
    # "skin rash" -> "skin_rash"
    symptom = re.sub(r'\s+', '_', symptom)

    # Collapse duplicate underscores
    symptom = re.sub(r'_+', '_', symptom)

    return symptom.strip('_')


def clean(row):
    symptoms = set()

    for value in row:
        if not value:
            continue

        value = str(value).strip()

        if not value or value.lower() == 'nan':
            continue

        normalized = normalize(value)

        if normalized:
            symptoms.add(normalized)

    return sorted(symptoms)


df[symptom_cols] = (
    df[symptom_cols]
    .fillna('')
    .astype(str)
)

df = df.drop_duplicates(
    subset=['Disease'] + symptom_cols
).reset_index(drop=True)


X_labels = df[symptom_cols].apply(clean, axis=1)

mlb = MultiLabelBinarizer()

X = mlb.fit_transform(X_labels)

y = df['Disease'].astype(str).str.strip()


model = LogisticRegression(
    max_iter=3000,
    random_state=42
)

model.fit(X, y)


with open(OUT / 'disease_model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open(OUT / 'symptom_encoder.pkl', 'wb') as f:
    pickle.dump(mlb, f)


metadata = {
    'model': 'LogisticRegression',
    'training_rows': len(df),
    'disease_count': int(y.nunique()),
    'symptom_count': len(mlb.classes_),
    'confidence_threshold': 70,
    'min_recognized_symptoms': 2
}


(
    OUT / 'model_metadata.json'
).write_text(
    json.dumps(metadata, indent=2),
    encoding='utf-8'
)


print(json.dumps(metadata, indent=2))