import os
import sys
import subprocess

# Ensure pillow is installed
try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

def analyze_image(path):
    try:
        img = Image.open(path)
        img = img.resize((100, 100)) # resize for fast analysis
        colors = img.getcolors(10000)
        
        # Count purple/violet pixels (approximate ranges)
        # Purple in RGB usually has high Red and Blue, low Green. e.g. R > 120, B > 120, G < 100, or R > 100, B > 150, G < 120, etc.
        purple_count = 0
        total_pixels = 10000
        r_sum, g_sum, b_sum = 0, 0, 0
        
        for count, rgb in colors:
            if len(rgb) >= 3:
                r, g, b = rgb[0], rgb[1], rgb[2]
                r_sum += r * count
                g_sum += g * count
                b_sum += b * count
                
                # Check for purple/magenta/pink chair hue
                # Dental chair in screenshot is a dark/vibrant purple
                if r > 80 and b > 100 and g < r * 0.7 and g < b * 0.7:
                    purple_count += count
                    
        avg_r = r_sum / total_pixels
        avg_g = g_sum / total_pixels
        avg_b = b_sum / total_pixels
        
        print(f"{os.path.basename(path)}:")
        print(f"  Avg Color: RGB({avg_r:.1f}, {avg_g:.1f}, {avg_b:.1f})")
        print(f"  Purple-like Pixels: {purple_count} / 10000 ({purple_count/100:.1f}%)")
    except Exception as e:
        print(f"Error analyzing {path}: {e}")

dir_path = "public/images/assets"
for f in os.listdir(dir_path):
    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
        # Only check the main ones to avoid clutter
        if "WhatsApp" in f or "Screenshot" in f or "042523" in f or "bda0b3" in f or "dr-hanan" in f:
            analyze_image(os.path.join(dir_path, f))
