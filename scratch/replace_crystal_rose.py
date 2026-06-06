from pathlib import Path
import re
root = Path("c:/Users/TheSh/OneDrive/Desktop/revera-clinic-website-main")
files = [p for p in root.rglob('*') if p.suffix.lower() in {'.ts','.tsx','.js','.jsx','.json','.md','.html','.css','.txt'} and 'node_modules' not in p.parts and '.git' not in p.parts]
replacements = [
    (re.compile(r'Revera'), 'REVERA'),
    (re.compile(r'Revera'), 'Revera'),
    (re.compile(r'Revera'), 'revera'),
]
count = 0
for p in files:
    text = p.read_text(encoding='utf-8')
    new = text
    for pattern, repl in replacements:
        new = pattern.sub(repl, new)
    if new != text:
        p.write_text(new, encoding='utf-8')
        print(f'Updated {p}')
        count += 1
print(f'Files updated: {count}')
