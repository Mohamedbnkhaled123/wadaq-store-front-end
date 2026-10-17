import os
import glob
from PIL import Image

def convert_all():
    pub_dir = os.path.join(os.path.dirname(__file__), '../public/images/products')
    files = glob.glob(os.path.join(pub_dir, '*.webp'))
    print(f"Found {len(files)} webp images to convert to jpg...")
    
    count = 0
    for f in files:
        jpg_path = os.path.splitext(f)[0] + '.jpg'
        try:
            with Image.open(f) as im:
                rgb_im = im.convert('RGB')
                w, h = rgb_im.size
                if max(w, h) > 800:
                    ratio = 800 / max(w, h)
                    rgb_im = rgb_im.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
                rgb_im.save(jpg_path, 'JPEG', quality=85, optimize=True)
                count += 1
        except Exception as e:
            print(f"Error on {f}: {e}")
            
    print(f"Successfully generated {count} JPG files in {pub_dir}")

if __name__ == '__main__':
    convert_all()
