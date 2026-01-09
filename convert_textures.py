import os
from PIL import Image
import numpy as np

# Use raw string for Windows path with spaces
source_dir = r"D:\_ARQUIVOS DISCO C\Downloads\arvore das emocoes\public\textures\leaves"
threshold = 200

print(f"Processing images in {source_dir}...")

if not os.path.exists(source_dir):
    print(f"Directory not found: {source_dir}")
    # Try safe path
    source_dir = os.path.join(os.getcwd(), 'public', 'textures', 'leaves')
    print(f"Trying relative path: {source_dir}")

if not os.path.exists(source_dir):
     print("Still not found. Exiting.")
     exit(1)

files = [f for f in os.listdir(source_dir) if f.lower().endswith('.jpg') or f.lower().endswith('.jpeg')]

if not files:
    print("No JPG files found!")

for filename in files:
    try:
        jpg_path = os.path.join(source_dir, filename)
        png_filename = os.path.splitext(filename)[0] + ".png"
        png_path = os.path.join(source_dir, png_filename)
        
        print(f"Converting {filename} -> {png_filename}")
        
        img = Image.open(jpg_path).convert("RGBA")
        data = np.array(img)
        r, g, b, a = data.T
        white_areas = (r > threshold) & (g > threshold) & (b > threshold)
        data[..., 3] = 255
        data[..., 3][white_areas.T] = 0
        
        new_img = Image.fromarray(data)
        new_img.save(png_path, "PNG")
        
        if os.path.exists(png_path):
             print(f"SUCCESS: Created {png_path}")
        else:
             print(f"ERROR: Failed to create {png_path}")
             
    except Exception as e:
        print(f"Failed to process {filename}: {e}")

print("Done.")
