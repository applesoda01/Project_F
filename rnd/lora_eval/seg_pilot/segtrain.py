import numpy as np,torch,torch.nn as nn,torch.nn.functional as F,time,sys
torch.set_num_threads(2);torch.manual_seed(0)
NC=27
def cb(i,o): return nn.Sequential(nn.Conv2d(i,o,3,padding=1,bias=False),nn.BatchNorm2d(o),nn.ReLU(True),nn.Conv2d(o,o,3,padding=1,bias=False),nn.BatchNorm2d(o),nn.ReLU(True))
class UNet(nn.Module):
    def __init__(s,w=16):
        super().__init__();c=[w,w*2,w*4,w*8,w*8]
        s.e=nn.ModuleList([cb(5,c[0])]+[cb(c[i],c[i+1]) for i in range(4)])
        s.d=nn.ModuleList([cb(c[i+1]+c[i],c[i]) for i in range(4)]);s.o=nn.Conv2d(c[0],NC,1)
    def forward(s,x,co=None):
        x=torch.cat([x,co if co is not None else coords(x.size(0),x.size(2),x.size(3))],1);f=[];
        for i,m in enumerate(s.e):
            x=m(x if i==0 else F.max_pool2d(x,2));f.append(x)
        for i in range(3,-1,-1):
            x=s.d[i](torch.cat([F.interpolate(x,scale_factor=2,mode='bilinear',align_corners=False),f[i]],1))
        return s.o(x)
def prep(x): return torch.from_numpy(x).permute(0,3,1,2).float()/255.-0.5
def coords(b,h,w,y0=0,x0=0,H=256,W=256):
    yy=(torch.arange(y0,y0+h).float()/H-0.5).view(1,1,h,1).expand(b,1,h,w);xx=(torch.arange(x0,x0+w).float()/W-0.5).view(1,1,1,w).expand(b,1,h,w)
    return torch.cat([yy,xx],1)
def miou(p,y):
    r=[]
    for c in range(1,NC):
        a=(p==c);b=(y==c);u=(a|b).sum()
        if b.sum()>0: r.append(((a&b).sum()/max(u,1)).item())
    return float(np.mean(r))
if __name__=='__main__':
    ep=int(sys.argv[1]);tr=np.load('/tmp/mq12/seg/train.npz');va=np.load('/tmp/mq12/seg/val.npz')
    X,Y=tr['x'],tr['y'];vx,vy=prep(va['x']),torch.from_numpy(va['y']).long()
    net=UNet();opt=torch.optim.AdamW(net.parameters(),2e-3,weight_decay=1e-4)
    n=len(X);bs=16;steps=ep*(n//bs);sch=torch.optim.lr_scheduler.OneCycleLR(opt,3e-3,total_steps=steps)
    t0=time.time();st=0
    for e in range(ep):
        perm=np.random.permutation(n);net.train()
        for i in range(0,n-bs+1,bs):
            idx=perm[i:i+bs];x=prep(X[idx]);y=torch.from_numpy(Y[idx]).long();cy,cx=np.random.randint(0,129,2);x=x[:,:,cy:cy+128,cx:cx+128];y=y[:,cy:cy+128,cx:cx+128];co=coords(bs,128,128,cy,cx)
                        # 약한 색 변형
            x=x*(1+0.1*torch.randn(x.size(0),3,1,1))+0.05*torch.randn(x.size(0),3,1,1)
            loss=F.cross_entropy(net(x,co),y);opt.zero_grad();loss.backward();opt.step();sch.step();st+=1
            if st%50==0: print(f'ep{e} step{st}/{steps} loss{loss.item():.3f} {time.time()-t0:.0f}s',flush=True)
        net.eval()
        with torch.no_grad(): p=torch.cat([net(vx[i:i+50]).argmax(1) for i in range(0,len(vx),50)])
        print(f'== ep{e} val mIoU {miou(p,vy):.3f} pixacc {(p==vy).float().mean():.3f}',flush=True)
        torch.save(net.state_dict(),'/tmp/mq12/seg/net.pt')
