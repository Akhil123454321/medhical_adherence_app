import json
from datetime import datetime, timezone, timedelta

INDIANA = timezone(timedelta(hours=-4))  # EDT

records = json.load(open('/home/ubuntu/medhical_adherence_app/database/adherence-records.json'))
self_records = [r for r in records if r.get('recordType') == 'self' and not r['userId'].startswith('test') and r.get('reportTimestamp')]

hours = {}
for r in self_records:
    dt = datetime.fromisoformat(r['reportTimestamp'].replace('Z', '+00:00')).astimezone(INDIANA)
    h = dt.hour
    hours[h] = hours.get(h, 0) + 1

print("Check-in distribution by hour (Indiana time):")
for h in sorted(hours):
    bar = '█' * hours[h]
    period = "AM" if h < 12 else "PM"
    label = f"{h if h <= 12 else h-12}:00 {period}"
    print(f"  {label:10} | {bar} ({hours[h]})")
