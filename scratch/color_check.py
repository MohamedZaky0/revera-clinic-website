from PIL import Image
import os

def find_purple_in_image(path):
    try:
        img = Image.open(path)
        img = img.resize((200, 200)) # 40,000 pixels
        pixels = img.getdata()
        
        purple_count = 0
        for p in pixels:
            if len(p) >= 3:
                r, g, b = p[0], p[1], p[2]
                # Purple/Magenta check: R and B are somewhat high, G is low
                # e.g., R > 60, B > 60, G < R * 0.6, G < B * 0.6
                if r > 50 and b > 50 and g < r * 0.6 and g < b * 0.6:
                    # Also make sure they are not too grey
                    if abs(r - b) < (r + b) * 0.4:
                        purple_count += 1
                        
        percentage = (purple_count / 40000) * 100
        print(f"{os.path.basename(path)}: {purple_count} / 40000 ({percentage:.2f}%) purple pixels")
    except Exception as e:
        print(f"Error {path}: {e}")

dir_path = "public/images/assets"
for f in os.listdir(dir_path):
    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
        if "WhatsApp" in f or "Screenshot" in f or "0425" in f or "bda0" in f or "dr-hanan-18" in f or "dr-hanan-19" in f:
            find_purple_in_image(os.path.join(dir_path, f))
