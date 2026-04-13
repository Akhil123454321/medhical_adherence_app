import json

# Load users to find assigned caps
with open('database/users.json') as f:
    users = json.load(f)

assigned = {u['capId']: u['id'] for u in users if u.get('capId')}

caps = []
for i in range(1, 301):
    if i in assigned:
        caps.append({"id": i, "status": "assigned", "assignedTo": assigned[i], "cohortId": None, "lastSeen": None, "hardwareId":
None})
    else:
        caps.append({"id": i, "status": "available", "assignedTo": None, "cohortId": None, "lastSeen": None, "hardwareId": None})

with open('database/caps.json', 'w') as f:
    json.dump(caps, f, indent=2)

print(f"Created {len(caps)} caps, {len(assigned)} assigned")
