from pathlib import Path

root = Path(".").resolve()
count = 0
for path in root.rglob("*.*"):
    if path.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx", ".json", ".md"}:
        continue
    if "node_modules" in str(path) or ".git" in str(path):
        continue
    text = path.read_text(encoding="utf-8")
    new_text = text.replace('src="/images/logo-face.png"', 'src="/images/main_logo.png"')
    new_text = new_text.replace('src="/images/logo.png"', 'src="/images/main_logo.png"')
    new_text = new_text.replace("src='/images/logo-face.png'", "src='/images/main_logo.png'")
    new_text = new_text.replace("src='/images/logo.png'", "src='/images/main_logo.png'")
    new_text = new_text.replace('icon: "/images/logo.png"', 'icon: "/images/main_logo.png"')
    new_text = new_text.replace("icon: '/images/logo.png'", "icon: '/images/main_logo.png'")
    new_text = new_text.replace('apple: "/images/logo.png"', 'apple: "/images/main_logo.png"')
    new_text = new_text.replace("apple: '/images/logo.png'", "apple: '/images/main_logo.png'")
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        count += 1
        print(f"Updated {path}")
print(f"Updated files: {count}")
