// Byte progress, bounded requests, and per-resource retries. Completed assets survive retries.
export async function fetchAsset(url, {onProgress=()=>{}, timeout=25000, attempts=2} = {}) {
  let error;
  for (let attempt=0; attempt<attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeout);
    try {
      onProgress(0);
      const response = await fetch(url, {signal:controller.signal});
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      if (!response.body?.getReader) {
        const blob = await response.blob(); onProgress(blob.size); return blob;
      }
      const reader = response.body.getReader(), chunks=[];
      let received=0;
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        chunks.push(value); received+=value.byteLength; onProgress(received);
      }
      return new Blob(chunks, {type:response.headers.get('content-type')||'application/octet-stream'});
    } catch (cause) { error = cause; }
    finally { clearTimeout(timer); }
  }
  throw new Error(`资源加载失败：${url}`, {cause:error});
}

export async function decodeImage(blob, timeout=12000) {
  const url = URL.createObjectURL(blob), image = new Image();
  let timer;
  try {
    await Promise.race([
      new Promise((resolve,reject)=>{
        image.onload=resolve; image.onerror=()=>reject(new Error('图片解码失败')); image.src=url;
      }).then(()=>image.decode?.()),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('图片解码超时')),timeout);}),
    ]);
    return image;
  } finally {clearTimeout(timer); URL.revokeObjectURL(url);}
}
