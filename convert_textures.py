import os
from PIL import Image
import numpy as np

source_dir = r"D:\_ARQUIVOS DISCO C\Downloads\arvore das emocoes\public\textures\leaves"
threshold = 200 # Threshold for "white" background

print(f"Processing images in {source_dir}...")

if not os.path.exists(source_dir):
    print(f"Directory not found: {source_dir}")
    exit(1)

files = [f for f in os.listdir(source_dir) if f.lower().endswith('.jpg') or f.lower().endswith('.jpeg')]

for filename in files:
    try:
        jpg_path = os.path.join(source_dir, filename)
        png_filename = os.path.splitext(filename)[0] + ".png"
        png_path = os.path.join(source_dir, png_filename)
        
        print(f"Converting {filename} -> {png_filename}")
        
        img = Image.open(jpg_path).convert("RGBA")
        
        # Simple Chroma Key: Make white/light-gray pixels transparent
        data = np.array(img)
        r, g, b, a = data.T
        
        # Define white-ish background (adjust threshold as needed)
        # Assuming background is lighter than the leaf
        white_areas = (r > threshold) & (g > threshold) & (b > threshold)
        
        data[..., 3] = 255 # Default fully opaque
        data[..., 3][white_areas.T] = 0 # Make white areas transparent
        
        new_img = Image.fromarray(data)
        new_img.save(png_path, "PNG")
        print(f"Saved {png_filename}")
        
    except Exception as e:
        print(f"Failed to process {filename}: {e}")

print("Done.")
