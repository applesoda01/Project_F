// ComfyUI API 그래프 구성 함수 (브라우저 콘솔/자동화에서 사용). 체크포인트 Illustrious-XL, ControlNet promax(union canny/lineart).
window.mqGraph=(o)=>{const g={};let m=['1',0],c=['1',1];
g['1']={class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'Illustrious-XL-v1.0.safetensors'}};
let n=10;for(const l of (o.loras||[])){const id=String(n++);g[id]={class_type:'LoraLoader',inputs:{model:m,clip:c,lora_name:l[0],strength_model:l[1],strength_clip:l[1]}};m=[id,0];c=[id,1];}
g['3']={class_type:'CLIPTextEncode',inputs:{text:o.pos,clip:c}};
g['4']={class_type:'CLIPTextEncode',inputs:{text:o.neg,clip:c}};
g['5']={class_type:'LoadImage',inputs:{image:o.ctrl}};
g['6']={class_type:'ControlNetLoader',inputs:{control_net_name:'diffusion_pytorch_model_promax.safetensors'}};
g['7']={class_type:'SetUnionControlNetType',inputs:{control_net:['6',0],type:o.ctype||'canny/lineart/anime_lineart/mlsd'}};
g['8']={class_type:'ControlNetApplyAdvanced',inputs:{positive:['3',0],negative:['4',0],control_net:['7',0],image:['5',0],strength:o.cs??0.9,start_percent:0,end_percent:o.ce??0.8,vae:['1',2]}};
g['9']={class_type:'EmptyLatentImage',inputs:{width:1024,height:1024,batch_size:1}};
g['20']={class_type:'KSampler',inputs:{model:m,positive:['8',0],negative:['8',1],latent_image:['9',0],seed:o.seed,steps:o.steps||28,cfg:o.cfg||6,sampler_name:'euler_ancestral',scheduler:'normal',denoise:1}};
g['21']={class_type:'VAEDecode',inputs:{samples:['20',0],vae:['1',2]}};
g['22']={class_type:'SaveImage',inputs:{images:['21',0],filename_prefix:o.prefix}};return g;};
// 제출: fetch('/prompt',{method:'POST',body:JSON.stringify({prompt:mqGraph(o),client_id:'x'})})
