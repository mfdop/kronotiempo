const fs=require('fs'),{PNG}=require('pngjs')
exports.load=f=>{const p=PNG.sync.read(fs.readFileSync(f));return {w:p.width,h:p.height,d:p.data}}
exports.save=(f,img)=>{const p=new PNG({width:img.w,height:img.h});img.d.copy?img.d.copy(p.data):p.data.set(img.d);fs.writeFileSync(f,PNG.sync.write(p))}
exports.crop=(img,x,y,w,h,k=1,grid=0)=>{const o={w:w*k,h:h*k,d:Buffer.alloc(w*k*h*k*4)}
 for(let j=0;j<h*k;j++)for(let i=0;i<w*k;i++){const sx=x+Math.floor(i/k),sy=y+Math.floor(j/k);const si=(sy*img.w+sx)*4,di=(j*o.w+i)*4
 for(let c=0;c<4;c++)o.d[di+c]=img.d[si+c]
 if(grid&&((sx%grid==0&&i%k==0)||(sy%grid==0&&j%k==0))){o.d[di]=255;o.d[di+1]=0;o.d[di+2]=255}}
 return o}
