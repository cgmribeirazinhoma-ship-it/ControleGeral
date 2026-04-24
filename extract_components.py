import re
import os

with open(r'c:\Users\thiag\OneDrive\Desktop\Sistema\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

def extract_function(func_name, code):
    # Regex to find `function Name(` and match until the end of the function.
    # This uses a simple brace matching logic.
    match = re.search(r'function\s+' + func_name + r'\s*\(.*', code, re.DOTALL)
    if not match:
        return None, code
    
    start_index = match.start()
    brace_count = 0
    in_string = False
    string_char = ''
    
    i = start_index
    while i < len(code) and code[i] != '{':
        i += 1
    
    brace_count = 1
    i += 1
    
    while i < len(code) and brace_count > 0:
        c = code[i]
        if not in_string:
            if c in ['"', "'", '`']:
                in_string = True
                string_char = c
            elif c == '{':
                brace_count += 1
            elif c == '}':
                brace_count -= 1
        else:
            if c == '\\':
                i += 1
            elif c == string_char:
                in_string = False
        i += 1
        
    func_code = code[start_index:i]
    new_code = code[:start_index] + code[i:]
    return func_code, new_code

def save_component(name, func_code):
    path = f'c:\\Users\\thiag\\OneDrive\\Desktop\\Sistema\\src\\components\\{name}.js'
    prefix = "/* ─── src/components/" + name + ".js ─── */\nconst { useState, useEffect, useCallback, useMemo, useRef } = React;\n\n"
    with open(path, 'w', encoding='utf-8') as f:
        f.write(prefix + func_code + "\n")
    print(f'Saved {name}.js')

components_to_extract = ['HistoricoPage', 'NovoProcessoPage', 'ConfigPage', 'PageHeader', 'ConfirmModal']
new_app_content = content

for comp in components_to_extract:
    func_code, new_app_content = extract_function(comp, new_app_content)
    if func_code:
        save_component(comp, func_code)
    else:
        print(f"Could not find {comp}")

with open(r'c:\Users\thiag\OneDrive\Desktop\Sistema\app.js', 'w', encoding='utf-8') as f:
    f.write(new_app_content)

print("Done extracting.")
