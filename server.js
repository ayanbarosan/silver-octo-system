const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
http.createServer((req,res)=>{ const name=decodeURIComponent(req.url.split('?')[0]); const file=path.join(root,name==='/'?'index.html':name); if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();} fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');} res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);});}).listen(process.env.PORT||3000,'0.0.0.0');
