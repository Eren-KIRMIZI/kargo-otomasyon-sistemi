import sys

with open('backend/app/api/routes/orders.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

returns_start = -1
returns_end = -1

for i, line in enumerate(lines):
    if line.startswith('@router.post("/returns"'):
        returns_start = i
    if line.startswith('@router.delete("/{order_id}"'):
        returns_end = i
        break

if returns_start != -1 and returns_end != -1:
    returns_block = lines[returns_start:returns_end]
    lines = lines[:returns_start] + lines[returns_end:]

    order_id_start = -1
    for i, line in enumerate(lines):
        if line.startswith('@router.get("/{order_id}"'):
            order_id_start = i
            break
            
    if order_id_start != -1:
        lines = lines[:order_id_start] + returns_block + lines[order_id_start:]
        with open('backend/app/api/routes/orders.py', 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Success")
    else:
        print("Could not find order_id_start")
else:
    print("Could not find returns block")
