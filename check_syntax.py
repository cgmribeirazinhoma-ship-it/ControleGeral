import re

with open('app.js', 'r') as f:
    content = f.read()

# Check for ?. (optional chaining)
# Matches ?. followed by a non-digit
if re.search(r'\?\.[^0-9]', content):
    print("Found optional chaining")
    for m in re.finditer(r'\?\.[^0-9]', content):
        start = max(0, m.start() - 20)
        end = min(len(content), m.end() + 20)
        print(f"  Context: ...{content[start:end]}...")

# Check for ?? (nullish coalescing)
if '??' in content:
    print("Found nullish coalescing")
    for m in re.finditer(r'\?\?', content):
        start = max(0, m.start() - 20)
        end = min(len(content), m.end() + 20)
        print(f"  Context: ...{content[start:end]}...")

# Check for files.[0] specifically
if 'files.[' in content:
    print("Found files.[0]")

# Check for modern catch
if re.search(r'catch\s*\{', content):
    print("Found omit catch binding")
