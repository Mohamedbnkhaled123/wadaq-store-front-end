import os
import glob
import shutil
from PIL import Image

def optimize_png(path, max_dim):
    if not os.path.exists(path):
        return
    orig_sz = os.path.getsize(path)
    im = Image.open(path)
    w, h = im.size
    ratio = min(max_dim / w, max_dim / h, 1.0)
    new_w, new_h = int(w * ratio), int(h * ratio)
    if ratio < 1.0:
        im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    im.save(path, 'PNG', optimize=True)
    new_sz = os.path.getsize(path)
    print(f"Optimized PNG {path}: ({w}x{h} -> {new_w}x{new_h}) {orig_sz // 1024}KB -> {new_sz // 1024}KB")

def optimize_products():
    pub_dir = 'public/images/products'
    dist_dir = 'dist/wadaq-store/browser/images/products'
    
    files = glob.glob(f'{pub_dir}/*.webp')
    print(f"Found {len(files)} files to check/optimize...")
    
    total_saved = 0
    count = 0
    for f in files:
        fname = os.path.basename(f)
        # Restore if corrupted or 0 bytes
        if os.path.getsize(f) == 0:
            dist_source = os.path.join(dist_dir, fname)
            if os.path.exists(dist_source):
                shutil.copy2(dist_source, f)
                print(f"Restored 0-byte file: {fname}")
        
        orig_sz = os.path.getsize(f)
        try:
            im = Image.open(f)
            w, h = im.size
            if w > 480 or h > 480:
                ratio = min(480 / w, 480 / h)
                new_w, new_h = int(w * ratio), int(h * ratio)
                im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
                im.save(f, 'WEBP', quality=80, method=3)
                new_sz = os.path.getsize(f)
                total_saved += (orig_sz - new_sz)
                count += 1
            else:
                pass
        except Exception as e:
            print(f"Error on {fname}: {e}")
            
    print(f"Optimized {count} product images. Total saved in this pass: {total_saved // 1024}KB")

def sync_to_dist():
    print("Syncing optimized images to dist...")
    dist_images = 'dist/wadaq-store/browser/images'
    if os.path.exists(dist_images):
        for root, dirs, files in os.walk('public/images'):
            if '.backup' in root:
                continue
            rel_dir = os.path.relpath(root, 'public/images')
            target_dir = os.path.join(dist_images, rel_dir) if rel_dir != '.' else dist_images
            os.makedirs(target_dir, exist_ok=True)
            for file in files:
                src_file = os.path.join(root, file)
                dst_file = os.path.join(target_dir, file)
                shutil.copy2(src_file, dst_file)
        print("Successfully synced all optimized images to dist/wadaq-store/browser/images")

if __name__ == '__main__':
    # 1. mk-logo.png
    optimize_png('public/images/mk-logo.png', 88)

    # 2. logo.png & logo.svg
    optimize_png('public/images/logo.png', 200)
    if os.path.exists('public/images/logo.png'):
        shutil.copy2('public/images/logo.png', 'public/images/logo.svg')

    # 3. ai-avatar-robot.png
    optimize_png('public/images/ai-avatar-robot.png', 160)

    # 4. products
    optimize_products()

    # 5. sync everything to dist so running server has it immediately!
    sync_to_dist()
