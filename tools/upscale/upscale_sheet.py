# 걷기 시트 업스케일: Real-ESRGAN anime_6B(ONNX) ×4 → 원하는 셀 크기로 축소. 투명 영역 테두리 번짐 방지 포함
import sys, time, numpy as np, onnxruntime as ort
from PIL import Image
from scipy import ndimage as nd
def bleed(rgba):  # 투명 픽셀의 색을 가장 가까운 불투명 픽셀 색으로 채움 (검은 테두리 방지)
    a = rgba[..., 3] > 8
    idx = nd.distance_transform_edt(~a, return_distances=False, return_indices=True)
    out = rgba.copy(); out[..., :3] = rgba[..., :3][idx[0], idx[1]]; return out
def run(sess, rgb):  # HxWx3 uint8 → 4H x 4W x3
    x = rgb.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    y = sess.run(None, {'input': x})[0][0]
    return (np.clip(y, 0, 1).transpose(1, 2, 0) * 255 + 0.5).astype(np.uint8)
def upscale_cell(sess, cell):
    c = bleed(cell)
    rgb = run(sess, c[..., :3])
    a = run(sess, np.repeat(cell[..., 3:4], 3, 2))[..., 0]  # 알파도 같은 모델로 (선이 또렷해짐)
    return np.dstack([rgb, a])
if __name__ == '__main__':
    model, src, dst, cell_out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    frames = sys.argv[5] if len(sys.argv) > 5 else None
    so = ort.SessionOptions(); so.intra_op_num_threads = 2
    sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
    sh = np.array(Image.open(src).convert('RGBA')); C = 128; R, Cn = sh.shape[0] // C, sh.shape[1] // C
    out = Image.new('RGBA', (Cn * cell_out, R * cell_out))
    todo = [(r, c) for r in range(R) for c in range(Cn)] if not frames else [tuple(map(int, f.split(','))) for f in frames.split(';')]
    t0 = time.time()
    for i, (r, c) in enumerate(todo):
        up = upscale_cell(sess, sh[r*C:(r+1)*C, c*C:(c+1)*C])
        out.paste(Image.fromarray(up, 'RGBA').resize((cell_out, cell_out), Image.LANCZOS), (c * cell_out, r * cell_out))
        if i == 0: print('first cell', round(time.time() - t0, 1), 's', flush=True)
    out.save(dst, optimize=True); print('done', len(todo), 'cells', round(time.time() - t0, 1), 's', out.size)
