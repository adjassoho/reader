import os
from PIL import Image, ImageDraw

def create_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    padding = max(1, int(size * 0.06))
    radius = int(size * 0.22)
    
    bg_color = (67, 56, 202, 255) # Indigo 700
    accent_color = (129, 140, 248, 255) # Indigo 400
    white = (255, 255, 255, 255)
    
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=bg_color
    )
    
    center_x = size // 2
    center_y = size // 2
    
    def s(v):
        return int(v * (size / 128.0))
    
    if size >= 48:
        # Book pages
        draw.polygon([
            (center_x - s(4), center_y + s(24)),
            (center_x - s(38), center_y + s(20)),
            (center_x - s(38), center_y - s(14)),
            (center_x - s(4), center_y - s(8))
        ], fill=(238, 242, 255, 255))
        
        draw.polygon([
            (center_x + s(4), center_y + s(24)),
            (center_x + s(38), center_y + s(20)),
            (center_x + s(38), center_y - s(14)),
            (center_x + s(4), center_y - s(8))
        ], fill=white)
        
        # Sparkle star at top-right
        sp_x = center_x + s(18)
        sp_y = center_y - s(28)
        sp_r = s(12)
        draw.line([(sp_x - sp_r, sp_y), (sp_x + sp_r, sp_y)], fill=(96, 165, 250, 255), width=max(1, s(3)))
        draw.line([(sp_x, sp_y - sp_r), (sp_x, sp_y + sp_r)], fill=(96, 165, 250, 255), width=max(1, s(3)))
        
        # Soundwave arcs on top left
        arc_bbox = [center_x - s(32), center_y - s(36), center_x - s(4), center_y - s(12)]
        draw.arc(arc_bbox, start=200, end=340, fill=accent_color, width=max(1, s(3)))
    else:
        # 16px icon
        draw.rectangle([s(24), s(36), center_x - s(3), s(96)], fill=white)
        draw.rectangle([center_x + s(3), s(36), size - s(24), s(96)], fill=(224, 231, 255, 255))
        draw.ellipse([center_x - s(8), s(16), center_x + s(8), s(32)], fill=(96, 165, 250, 255))
        
    img.save(output_path, "PNG")
    print(f"Generated {output_path} ({size}x{size})")

if __name__ == '__main__':
    os.makedirs('icons', exist_ok=True)
    for sz in [16, 48, 128]:
        create_icon(sz, f'icons/icon-{sz}.png')
