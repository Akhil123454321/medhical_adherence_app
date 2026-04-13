import json
records = json.load(open('adherence-records.json'))
real = [r for r in records if r.get('recordType') == 'self' and not r['userId'].startswith('test')][:5]
for r in real:
	print(r.get('reportTimestamp'), r.get('userId'))
