import re

def transpile(content):
    # 1. ?. -> .
    content = content.replace('?.', '.')
    # 2. ?? -> ||
    content = content.replace('??', '||')
    # 3. catch { -> catch(e){
    content = re.sub(r'catch\s*\{', 'catch(e){', content)

    # 4. Template literals `...` -> "..."
    # Handles simple interpolation ${expr}
    def handle_template(match):
        inner = match.group(1)
        parts = re.split(r'$\{(.*?)\}', inner)
        out = []
        for i, part in enumerate(parts):
            if i % 2 == 0: # Literal
                if part:
                    safe = part.replace('\\', '\\\\').replace('\"', '\\"').replace('\n', '\n').replace('\r', '\r')
                    out.append('\"' + safe + '\"')
            else: # Expression
                out.append('(' + part + ')')
        if not out: return '\"\"'
        return ' + '.join(out)

    content = re.sub(r'`([\s\S]*?)`', handle_template, content)

    # 5. Simple Arrow Functions (params) => {body} -> function(params) {body}
    content = re.sub(r'(\([^\)]*?\))\s*=>\s*\{', r'function\1 {', content)
    # Simple Arrow Functions arg => {body} -> function(arg) {body}
    content = re.sub(r'\b([a-zA-Z0-9_$]+)\s*=>\s*\{', r'function(\1) {', content)

    # 6. Arrow functions with immediate return: (params) => expr
    # This is risky but let's try for common React patterns
    content = re.sub(r'(\([^\)]*?\))\s*=>\s*([^\{\(\n;]+?)(?=[,;\)\n])', r'function\1 { return \2; }', content)
    content = re.sub(r'\b([a-zA-Z0-9_$]+)\s*=>\s*([^\{\(\n;]+?)(?=[,;\)\n])', r'function(\1) { return \2; }', content)

    # 7. Const/Let -> Var
    content = re.sub(r'\bconst\s+', 'var ', content)
    content = re.sub(r'\blet\s+', 'var ', content)

    # 8. Object property shorthand { a, b } -> { a: a, b: b }
    # Hard to do with regex, but let's see if we have many.

    return content

with open('app.js', 'r') as f:
    orig = f.read()

processed = transpile(orig)

# Fix double var
processed = processed.replace('var var ', 'var ')

with open('app.js', 'w') as f:
    f.write(processed)
