import json, hashlib

DEFAULT_HASH = hashlib.sha256("MedAdhere2026!".encode()).hexdigest()

users = json.load(open('users.json'))
count = 0
for u in users:
	if u.get('role') != 'admin' and not u.get('passwordHash'):
		u['passwordHash'] = DEFAULT_HASH
		count += 1

json.dump(users, open('users.json', 'w'))
print(f"Set default password for {count} users")
