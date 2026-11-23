// mask utils: masks are {w,h,a:Float32Array|Uint8Array}
exports.disk=r=>{const o=[];const R=Math.ceil(r);for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++)if(i*i+j*j<=r*r+0.01)o.push([i,j]);return o}
exports.dilate=(m,w,h,r)=>{const o=new Uint8Array(w*h),D=exports.disk(r);for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!m[y*w+x])continue;for(const [i,j] of D){const X=x+i,Y=y+j;if(X>=0&&Y>=0&&X<w&&Y<h)o[Y*w+X]=1}}return o}
exports.erode=(m,w,h,r)=>{const inv=m.map(v=>v?0:1);const d=exports.dilate(inv,w,h,r);return d.map(v=>v?0:1)}
exports.close=(m,w,h,r)=>exports.erode(exports.dilate(m,w,h,r),w,h,r)
exports.open=(m,w,h,r)=>exports.dilate(exports.erode(m,w,h,r),w,h,r)
// fill holes smaller than maxArea (components of !m not touching border)
exports.fillHoles=(m,w,h,maxArea=1e9)=>{const o=Uint8Array.from(m),lab=new Int32Array(w*h).fill(-1);let id=0
 for(let s=0;s<w*h;s++){if(m[s]||lab[s]>=0)continue;const st=[s],comp=[];lab[s]=id;let border=false
  while(st.length){const p=st.pop();comp.push(p);const x=p%w,y=(p/w)|0;if(x==0||y==0||x==w-1||y==h-1)border=true
   for(const q of [p-1,p+1,p-w,p+w]){if(q<0||q>=w*h)continue;if(Math.abs((q%w)-x)>1)continue;if(!m[q]&&lab[q]<0){lab[q]=id;st.push(q)}}}
  if(!border&&comp.length<=maxArea)for(const p of comp)o[p]=1;id++}
 return o}
exports.removeSmall=(m,w,h,minArea)=>{const o=Uint8Array.from(m),lab=new Uint8Array(w*h)
 for(let s=0;s<w*h;s++){if(!m[s]||lab[s])continue;const st=[s],comp=[];lab[s]=1
  while(st.length){const p=st.pop();comp.push(p);const x=p%w;for(const q of [p-1,p+1,p-w,p+w]){if(q<0||q>=w*h)continue;if(Math.abs((q%w)-x)>1)continue;if(m[q]&&!lab[q]){lab[q]=1;st.push(q)}}}
  if(comp.length<minArea)for(const p of comp)o[p]=0}
 return o}
exports.blur=(a,w,h,s)=>{ // gaussian on float array
 const R=Math.ceil(s*2.5),k=[];let t=0;for(let i=-R;i<=R;i++){const v=Math.exp(-i*i/(2*s*s));k.push(v);t+=v}k.forEach((v,i)=>k[i]=v/t)
 const tmp=new Float32Array(w*h),o=new Float32Array(w*h)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let i=-R;i<=R;i++){const X=Math.min(w-1,Math.max(0,x+i));v+=a[y*w+X]*k[i+R]}tmp[y*w+x]=v}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let i=-R;i<=R;i++){const Y=Math.min(h-1,Math.max(0,y+i));v+=tmp[Y*w+x]*k[i+R]}o[y*w+x]=v}
 return o}
exports.upsample=(a,w,h,k)=>{const W=w*k,H=h*k,o=new Float32Array(W*H)
 for(let Y=0;Y<H;Y++){const fy=(Y+0.5)/k-0.5,y0=Math.max(0,Math.floor(fy)),y1=Math.min(h-1,y0+1),ty=Math.min(1,Math.max(0,fy-y0))
  for(let X=0;X<W;X++){const fx=(X+0.5)/k-0.5,x0=Math.max(0,Math.floor(fx)),x1=Math.min(w-1,x0+1),tx=Math.min(1,Math.max(0,fx-x0))
   o[Y*W+X]=(a[y0*w+x0]*(1-tx)+a[y0*w+x1]*tx)*(1-ty)+(a[y1*w+x0]*(1-tx)+a[y1*w+x1]*tx)*ty}}
 return o}
exports.inPoly=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c}
exports.polyMask=(polys,ox,oy,w,h)=>{const o=new Uint8Array(w*h);for(const P of polys){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [x,y] of P){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 for(let y=Math.max(0,Math.floor(y0-oy));y<=Math.min(h-1,Math.ceil(y1-oy));y++)for(let x=Math.max(0,Math.floor(x0-ox));x<=Math.min(w-1,Math.ceil(x1-ox));x++)if(exports.inPoly(x+ox+0.5,y+oy+0.5,P))o[y*w+x]=1}return o}
// distance (chamfer, px) from each pixel to nearest pixel where m==1
exports.dist=(m,w,h)=>{const N=w*h,d=new Float32Array(N);for(let i=0;i<N;i++)d[i]=m[i]?0:1e9
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!d[i])continue;let v=d[i];if(x)v=Math.min(v,d[i-1]+1);if(y)v=Math.min(v,d[i-w]+1);if(x&&y)v=Math.min(v,d[i-w-1]+1.414);if(y&&x<w-1)v=Math.min(v,d[i-w+1]+1.414);d[i]=v}
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(!d[i])continue;let v=d[i];if(x<w-1)v=Math.min(v,d[i+1]+1);if(y<h-1)v=Math.min(v,d[i+w]+1);if(x<w-1&&y<h-1)v=Math.min(v,d[i+w+1]+1.414);if(y<h-1&&x)v=Math.min(v,d[i+w-1]+1.414);d[i]=v}
 return d}
