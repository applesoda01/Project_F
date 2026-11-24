import json, math, sys, os, tempfile
TMP=tempfile.gettempdir()   # exp_levers.js · exp_long.js 가 큰 중간 파일을 두는 곳
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
O=sys.argv[1]
for f in fm.findSystemFonts():
    if 'NotoSansCJK' in f: fm.fontManager.addfont(f)
plt.rcParams['font.family']='Noto Sans CJK KR'; plt.rcParams['axes.unicode_minus']=False
SURF='#fcfcfb'; INK='#0b0b0b'; INK2='#52514e'; MUTE='#8a8984'; GRID='#e9e8e4'
C=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4']
def base(ax):
    ax.set_facecolor(SURF)
    for s in ['top','right','left']: ax.spines[s].set_visible(False)
    ax.spines['bottom'].set_color(GRID); ax.tick_params(colors=INK2, length=0, labelsize=10)
# ---------- 그림 1: 결정별 효과 ----------
L=json.load(open(os.path.join(TMP,'levers_100x48.json'))); b=L['base']['S']['net']
def st(k):
    a=L[k]['S']['net']; d=[x-y for x,y in zip(a,b)]; n=len(d); m=sum(d)/n; sd=math.sqrt(sum((x-m)**2 for x in d)/(n-1)); return m,1.96*sd/math.sqrt(n)
rows=[('passive','아무것도 하지 않음 (리퀘스트 · 요리 안 함, 테이블 1세트)'),('tables0','테이블을 놓지 않음'),('noReq','리퀘스트를 들어주지 않음'),('cookDish','요리는 하되 준비량 · 시장은 그대로 둠'),('noCook','요리를 하지 않음'),('fee5','수수료 5%'),('tables1','테이블 1세트만'),('build','시설 업그레이드 4종 모두'),('fee15','수수료 15%'),('tables4','테이블 4세트까지 서두름'),('dg','던전에 파티 보내기'),('deco','장식을 열리는 대로 모두 삼'),('full','살 수 있는 것을 모두 삼 + 던전')]
vals=[(lab,)+st(k) for k,lab in rows]
bn=L['base']['net']; sd=math.sqrt(sum((x-bn)**2 for x in b)/(len(b)-1))
fig,ax=plt.subplots(figsize=(10.5,6.2),dpi=200); fig.patch.set_facecolor(SURF); base(ax)
ax.axvspan(-sd,sd,color='#efeeea',zorder=0); ax.axvline(0,color=INK2,lw=1,zorder=1)
ys=list(range(len(vals)))[::-1]
for y,(lab,m,ci) in zip(ys,vals):
    sig=abs(m)>ci; col=C[0] if sig else MUTE
    ax.plot([m-ci,m+ci],[y,y],color=col,lw=2,solid_capstyle='round',zorder=3); ax.plot([m],[y],'o',ms=8,color=col,mec=SURF,mew=2,zorder=4)
    ax.text(m+ci+5 if m>=0 else m-ci-5,y,f'{m:+.0f}G'.replace('-','−'),va='center',ha='left' if m>=0 else 'right',fontsize=10,color=INK,zorder=5)
ax.set_yticks(ys); ax.set_yticklabels([v[0] for v in vals],fontsize=10.5,color=INK)
ax.set_xlim(-160,80); ax.set_xticks([-150,-100,-50,0,50]); ax.set_xticklabels(['−150G','−100G','−50G','기준 봇','+50G'])
ax.xaxis.grid(True,color=GRID,lw=1); ax.set_axisbelow(True)
h1,=ax.plot([],[],'o-',color=C[0],lw=2,ms=7,label='효과가 확인됨 (95% 구간이 0을 벗어남)'); h2,=ax.plot([],[],'o-',color=MUTE,lw=2,ms=7,label='구분되지 않음 (구간이 0을 포함)')
import matplotlib.patches as mp
h3=mp.Patch(color='#efeeea',label=f'같은 플레이라도 판마다 달라지는 폭 (표준편차 ±{sd:.0f}G)')
ax.legend(handles=[h1,h2,h3],loc='lower left',frameon=False,fontsize=9.5,labelcolor=INK2,bbox_to_anchor=(-0.52,-0.2),ncol=3)
ax.set_title('플레이어의 결정이 첫해 월 운영 순이익을 얼마나 바꾸는가',loc='left',fontsize=14,color=INK,pad=26,fontweight='bold')
ax.text(0,1.035,f'기준 봇(관문 1 봇, 월 {bn:.0f}G)과의 차이 · 같은 시드 100판 짝 비교 · 막대는 95% 신뢰 구간',transform=ax.transAxes,fontsize=9.5,color=INK2)
fig.tight_layout(); fig.savefig(O+'/그림1_결정별_효과.png',facecolor=SURF); plt.close(fig)
# ---------- 그림 2: 금고 곡선 ----------
B=json.load(open(os.path.join(TMP,'long_base_60x144.json'))); F=json.load(open(os.path.join(TMP,'long_full_60x144.json')))
ws=list(range(12,145,12)); avg=lambda a: sum(a)/len(a)
gb=[avg([m['wk'][w-1]['gold'] for m in B]) for w in ws]; gf=[avg([m['wk'][w-1]['gold'] for m in F]) for w in ws]
fig,ax=plt.subplots(figsize=(10.5,4.6),dpi=200); fig.patch.set_facecolor(SURF); base(ax)
ax.plot(ws,gb,color=C[0],lw=2,marker='o',ms=6,mec=SURF,mew=1.5); ax.plot(ws,gf,color=C[1],lw=2,marker='o',ms=6,mec=SURF,mew=1.5)
ax.text(146,gb[-1]+500,f'사지 않는 봇  {gb[-1]:,.0f}G',color=INK,fontsize=10,va='center'); ax.text(146,gf[-1]-900,f'다 사는 봇  {gf[-1]:,.0f}G',color=INK,fontsize=10,va='center')
ax.plot([146.0-2.2],[gb[-1]+500],'s',color=C[0],ms=6,clip_on=False); ax.plot([146.0-2.2],[gf[-1]-900],'s',color=C[1],ms=6,clip_on=False)
ax.axvline(40,color=MUTE,lw=1); ax.text(41,20500,'길드 E급 (중앙 40주)\n= 프로토타입 끝',fontsize=9.5,color=INK2,va='top')
ax.axvline(96,color=MUTE,lw=1); ax.text(97,20500,'다 사는 봇도\n살 것이 끝남 (약 96주)',fontsize=9.5,color=INK2,va='top')
ax.set_xlim(8,178); ax.set_xticks(ws); ax.set_xticklabels([f'{w}주' for w in ws]); ax.set_ylim(0,24000); ax.set_yticks([0,5000,10000,15000,20000]); ax.set_yticklabels(['0','5,000G','10,000G','15,000G','20,000G'])
ax.yaxis.grid(True,color=GRID,lw=1); ax.set_axisbelow(True)
ax.set_title('금고에 쌓이는 돈 (60판 평균, 3년)',loc='left',fontsize=14,color=INK,pad=12,fontweight='bold')
fig.tight_layout(); fig.savefig(O+'/그림2_금고_곡선.png',facecolor=SURF); plt.close(fig)
# ---------- 그림 3: 모험가의 한 주 ----------
cats=[('_q','원정 중'),('_away','길드에 오지 않음'),('noq','맡을 의뢰가 없음'),('mates','동료를 기다림 · 실력 부족'),('_inj','부상')]
sh=[]
for q in range(12):
    T={};n=0
    for m in B:
        for x in m['wk'][q*12:q*12+12]:
            for k,v in x['idle'].items(): T[k]=T.get(k,0)+v; n+=v
    sh.append([100*T.get(k,0)/n for k,_ in cats])
fig,ax=plt.subplots(figsize=(10.5,4.8),dpi=200); fig.patch.set_facecolor(SURF); base(ax)
xs=list(range(12)); bot=[0]*12
for i,(k,lab) in enumerate(cats):
    v=[s[i] for s in sh]; ax.bar(xs,v,bottom=bot,width=0.72,color=C[i],edgecolor=SURF,linewidth=2,label=lab)
    for x in (0,11):
        if v[x]>=7: ax.text(x,bot[x]+v[x]/2,f'{v[x]:.0f}%',ha='center',va='center',fontsize=9.5,color='#ffffff' if i in (0,1) else INK,fontweight='bold')
    bot=[a+c for a,c in zip(bot,v)]
ax.set_xticks(xs); ax.set_xticklabels([f'{q*12+1}~{q*12+12}주' for q in range(12)],fontsize=8.5); ax.set_ylim(0,100); ax.set_yticks([0,25,50,75,100]); ax.set_yticklabels(['0','25%','50%','75%','100%'])
ax.yaxis.grid(True,color=GRID,lw=1); ax.set_axisbelow(True)
ax.legend(loc='upper center',bbox_to_anchor=(0.5,-0.1),ncol=5,frameon=False,fontsize=9.5,labelcolor=INK2,handlelength=1,handleheight=1)
ax.set_title('모험가들은 한 주를 어떻게 보내는가 (기준 봇 60판, 모험가 × 주 비율)',loc='left',fontsize=14,color=INK,pad=12,fontweight='bold')
fig.tight_layout(); fig.savefig(O+'/그림3_모험가의_한주.png',facecolor=SURF); plt.close(fig)
print('ok',sd)
