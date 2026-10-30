import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'step5_doctor_recommendation'))
from doctor_recommender import recommend_doctors
x=json.loads(sys.stdin.read())
print(json.dumps(recommend_doctors(x.get('disease'),x.get('location'),int(x.get('top_k',5))),default=str))
