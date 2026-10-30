from pathlib import Path
import json
import pickle
import sys
import re

BASE = Path(__file__).resolve().parent

# ---------------------------------------------------------
# Load trained model and symptom encoder
# ---------------------------------------------------------

with open(BASE / 'disease_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open(BASE / 'symptom_encoder.pkl', 'rb') as f:
    encoder = pickle.load(f)


# ---------------------------------------------------------
# Actual symptoms available in the trained model
# ---------------------------------------------------------

ENCODER_CLASSES = set(encoder.classes_)


# ---------------------------------------------------------
# Common user-friendly symptom aliases
#
# IMPORTANT:
# Keys use normalized underscore format because normalize()
# converts spaces to underscores before alias lookup.
# ---------------------------------------------------------

ALIASES = {

    # Skin
    'itchy_skin': 'itching',
    'itchiness': 'itching',
    'skin_rash': 'skin_rash',
    'skin_problem': 'skin_rash',

    # Fever
    'high_fever': 'high_fever',
    'high_temperature': 'high_fever',
    'fever': 'high_fever',

    # Pain
    'headache': 'headache',
    'head_pain': 'headache',

    'chest_pain': 'chest_pain',
    'chest_ache': 'chest_pain',

    'stomach_pain': 'stomach_pain',
    'stomach_ache': 'stomach_pain',
    'belly_pain': 'stomach_pain',

    # Throat
    'throat_pain': 'throat_irritation',
    'sore_throat': 'throat_irritation',
    'throat_irritation': 'throat_irritation',
    'irritated_throat': 'throat_irritation',

    # Cough
    'cough': 'cough',
    'coughing': 'cough',

    # Vomiting
    'vomiting': 'vomiting',
    'vomit': 'vomiting',
    'throwing_up': 'vomiting',

    # Breathing
    'shortness_of_breath': 'breathlessness',
    'difficulty_breathing': 'breathlessness',
    'breathing_difficulty': 'breathlessness',
    'breathlessness': 'breathlessness',

    # Cold / nose
    'runny_nose': 'runny_nose',
    'running_nose': 'runny_nose',

    'blocked_nose': 'congestion',
    'stuffy_nose': 'congestion',
    'nasal_congestion': 'congestion',

    # Sneezing
    'sneezing': 'continuous_sneezing',
    'continuous_sneezing': 'continuous_sneezing',

    # Muscle/body pain
    'body_pain': 'muscle_pain',
    'body_ache': 'muscle_pain',
    'muscle_ache': 'muscle_pain',

    # Eye
    'red_eyes': 'redness_of_eyes',
    'red_eye': 'redness_of_eyes',
    'eye_redness': 'redness_of_eyes',

    # Other common wording
    'yellow_eyes': 'yellowing_of_eyes',
    'yellow_eyes': 'yellowing_of_eyes',

    'yellow_skin': 'yellowish_skin',

    'dark_urine': 'dark_urine',

    'loose_motion': 'diarrhoea',
    'loose_motions': 'diarrhoea',
    'loose_stools': 'diarrhoea',

    'joint_pain': 'joint_pain',

    'weight_loss': 'weight_loss',
    'weight_gain': 'weight_gain',

    'loss_of_appetite': 'loss_of_appetite',

    'tiredness': 'fatigue',
    'tired': 'fatigue',

    'weakness': 'weakness',

    # Dataset-specific wording
    'dischromic_patches': 'dischromic_patches',
    'dischromic_patches_on_skin': 'dischromic_patches',

    'nodal_skin_eruptions': 'nodal_skin_eruptions',

    'patches_in_throat': 'patches_in_throat',

    'swollen_lymph_nodes': 'swelled_lymph_nodes',
    'swollen_lymph_node': 'swelled_lymph_nodes',

    'phlegm': 'phlegm',

    'loss_of_smell': 'loss_of_smell',

    'sinus_pressure': 'sinus_pressure',

    'redness_of_eyes': 'redness_of_eyes',

    'muscle_pain': 'muscle_pain',
}


# ---------------------------------------------------------
# Normalization and matching against actual model symptoms
# ---------------------------------------------------------

def normalize_format(symptom):
    """
    Standardize symptom text without changing its meaning.
    Examples:
        Skin Rash       -> skin_rash
        skin rash       -> skin_rash
        skin-rash       -> skin_rash
        high   fever    -> high_fever
        dischromic _ patches -> dischromic_patches
    """

    s = str(symptom).strip().lower()

    # Normalize hyphens and whitespace
    s = s.replace("-", "_")
    s = re.sub(r"\s*_\s*", "_", s)
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"_+", "_", s)

    return s.strip("_")


def normalize(symptom):
    """
    Normalize user input and apply known aliases.
    """

    s = normalize_format(symptom)

    # Apply the existing user-friendly aliases
    return ALIASES.get(s, s)


# Create a lookup using the model's ORIGINAL symptom names.
# This allows normalized input to match the encoder vocabulary.
ENCODER_LOOKUP = {
    normalize_format(symptom): symptom
    for symptom in encoder.classes_
}


def resolve_symptom(symptom):
    """
    Return the exact symptom name expected by the trained model.
    Return None when the symptom cannot be matched.
    """

    original = normalize_format(symptom)

    # First, try matching the entered symptom directly.
    # This avoids unnecessary alias substitutions.
    if original in ENCODER_LOOKUP:
        return ENCODER_LOOKUP[original]

    # Next, try the normalized alias.
    alias = ALIASES.get(original, original)

    if alias in ENCODER_LOOKUP:
        return ENCODER_LOOKUP[alias]

    return None

# ---------------------------------------------------------
# Prediction
# ---------------------------------------------------------

def predict(symptoms, top_k=3):

    if not isinstance(symptoms, list):
        return {
            'status': 'invalid_input',
            'recognized_symptoms': [],
            'unknown_symptoms': [],
            'predictions': [],
            'message': 'Symptoms must be provided as a list.'
        }

    # Normalize each input and match it against actual model symptoms.
    known = []
    unknown = []

    for symptom in symptoms:

        if not str(symptom).strip():
            continue

        normalized = normalize_format(symptom)
        resolved = resolve_symptom(symptom)

        if resolved is not None:
            known.append(resolved)
        else:
            unknown.append(normalized)

    # Remove duplicates while preserving the original model vocabulary.
    known = sorted(set(known))
    unknown = sorted(set(unknown))

    # Minimum symptom requirement
    if len(known) < 2:
        return {
            'status': 'insufficient_symptoms',
            'recognized_symptoms': known,
            'unknown_symptoms': unknown,
            'predictions': [],
            'message': 'Please provide at least 2 recognized symptoms.'
        }

    # Convert symptoms into model input
    X = encoder.transform([known])

    # Get disease probabilities
    probs = model.predict_proba(X)[0]

    # Get top predictions
    order = probs.argsort()[::-1][:top_k]

    predictions = [
        {
            'disease': str(model.classes_[i]),
            'confidence': round(float(probs[i]) * 100, 2)
        }
        for i in order
    ]

    top = predictions[0]

    # Existing confidence policy
    status = (
        'success'
        if top['confidence'] >= 70
        else 'low_confidence'
    )

    return {
        'status': status,
        'recognized_symptoms': known,
        'unknown_symptoms': unknown,
        'predictions': predictions,
        'message': (
            'Academic decision-support result; not a medical diagnosis.'
            if status == 'success'
            else 'Confidence is below 70%; please provide more symptoms.'
        )
    }

# ---------------------------------------------------------
# Command-line interface
# ---------------------------------------------------------

if __name__ == '__main__':

    data = json.loads(sys.stdin.read())

    print(
        json.dumps(
            predict(
                data.get('symptoms', []),
                int(data.get('top_k', 3))
            )
        )
    )