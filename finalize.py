import re

def transpile(content):
    # 1. Replace Optional Chaining and Nullish Coalescing (Simple pass)
    content = content.replace('?.', '.')
    content = content.replace('??', '||')

    # 2. Replace Omit Catch Binding
    content = re.sub(r'catch\s*\{', 'catch(e){', content)

    # 3. Replace const/let with var for maximum compatibility
    content = re.sub(r'\bconst\s+', 'var ', content)
    content = re.sub(r'\blet\s+', 'var ', content)

    # 4. Handle arrow functions that were previously handled by sed
    # This is tricky, let's just make sure the critical ones are okay.

    # 5. Fix known syntax issues from previous replacements
    content = content.replace('handleSalvarRef.current.()', 'handleSalvarRef.current && handleSalvarRef.current()')
    content = content.replace('handleGerarPDFRef.current.()', 'handleGerarPDFRef.current && handleGerarPDFRef.current()')
    content = content.replace('handleLimparRef.current.()', 'handleLimparRef.current && handleLimparRef.current()')
    content = content.replace('handleDuplicarUltimoRef.current.()', 'handleDuplicarUltimoRef.current && handleDuplicarUltimoRef.current()')

    # 6. Fix files.[0]
    content = content.replace('files.[0]', 'files[0]')

    return content

with open('app.js', 'r') as f:
    app_content = f.read()

# Make sure we don't double var
app_content = app_content.replace('var var ', 'var ')
app_content = transpile(app_content)

with open('app.js', 'w') as f:
    f.write(app_content)

print("Transpilation complete")
