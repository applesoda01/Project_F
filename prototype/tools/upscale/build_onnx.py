# Real-ESRGAN x4plus_anime_6B (.pth) → ONNX, torch 없이 변환 (가중치는 피클을 직접 읽음)
import zipfile, pickle, numpy as np, onnx, sys
from onnx import helper, TensorProto, numpy_helper
src, dst = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(src); pre = z.namelist()[0].split('/')[0]
class Storage:
    def __init__(s, key, dtype): s.key, s.dtype = key, dtype
def rebuild(storage, offset, size, stride, *a):
    buf = np.frombuffer(z.read(f'{pre}/data/{storage.key}'), dtype=storage.dtype)
    n = int(np.prod(size)) if size else 1
    arr = np.lib.stride_tricks.as_strided(buf[offset:], shape=size, strides=[s * buf.itemsize for s in stride]) if size else buf[offset:offset+1]
    return np.array(arr, dtype=np.float32)
class U(pickle.Unpickler):
    def find_class(s, mod, name):
        if name == '_rebuild_tensor_v2': return rebuild
        if name == 'FloatStorage': return np.float32
        if name == 'HalfStorage': return np.float16
        if mod == 'collections' and name == 'OrderedDict': import collections; return collections.OrderedDict
        if name.endswith('Storage'): return np.float32
        return super().find_class(mod, name)
    def persistent_load(s, pid):
        _, typ, key, loc, n = pid
        return Storage(key, np.dtype(typ) if not isinstance(typ, type) else typ)
W = U(z.open(f'{pre}/data.pkl')).load()
W = W.get('params_ema', W.get('params', W))
print('tensors', len(W), list(W)[:3])
nodes, inits = [], []
def init(name, arr): inits.append(numpy_helper.from_array(arr.astype(np.float32), name))
cnt = [0]
def nm(p): cnt[0] += 1; return f'{p}_{cnt[0]}'
def conv(x, key):
    w, b = W[key + '.weight'], W[key + '.bias']; init(key + '.w', w); init(key + '.b', b)
    y = nm('c'); nodes.append(helper.make_node('Conv', [x, key + '.w', key + '.b'], [y], pads=[1, 1, 1, 1])); return y
def lrelu(x): y = nm('l'); nodes.append(helper.make_node('LeakyRelu', [x], [y], alpha=0.2)); return y
def cat(xs): y = nm('cat'); nodes.append(helper.make_node('Concat', xs, [y], axis=1)); return y
def add(a, b): y = nm('add'); nodes.append(helper.make_node('Add', [a, b], [y])); return y
init('k02', np.array(0.2, np.float32))
def mul02(x): y = nm('mul'); nodes.append(helper.make_node('Mul', [x, 'k02'], [y])); return y
def rdb(x, p):
    x1 = lrelu(conv(x, p + '.conv1')); x2 = lrelu(conv(cat([x, x1]), p + '.conv2')); x3 = lrelu(conv(cat([x, x1, x2]), p + '.conv3'))
    x4 = lrelu(conv(cat([x, x1, x2, x3]), p + '.conv4')); x5 = conv(cat([x, x1, x2, x3, x4]), p + '.conv5'); return add(mul02(x5), x)
def up2(x):
    sc = nm('sc'); init(sc, np.array([1, 1, 2, 2], np.float32)); y = nm('up')
    nodes.append(helper.make_node('Resize', [x, '', sc], [y], mode='nearest')); return y
feat = conv('input', 'conv_first'); h = feat
nb = len({k.split('.')[1] for k in W if k.startswith('body.')})
for i in range(nb):
    t = rdb(rdb(rdb(h, f'body.{i}.rdb1'), f'body.{i}.rdb2'), f'body.{i}.rdb3'); h = add(mul02(t), h)
feat = add(feat, conv(h, 'conv_body'))
feat = lrelu(conv(up2(feat), 'conv_up1')); feat = lrelu(conv(up2(feat), 'conv_up2'))
out = conv(lrelu(conv(feat, 'conv_hr')), 'conv_last')
nodes.append(helper.make_node('Identity', [out], ['output']))
g = helper.make_graph(nodes, 'rrdb', [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, None, None])],
                      [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, None, None])], inits)
m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 13)]); m.ir_version = 8
onnx.checker.check_model(m); onnx.save(m, dst); print('blocks', nb, 'saved', dst)
