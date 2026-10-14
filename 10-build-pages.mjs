import { readFileSync, writeFileSync } from 'node:fs';
const root='apps/game/dist/';
let html=readFileSync(root+'index.html','utf8');
html=html.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g,(_,url)=>'<script type="module">'+readFileSync(root+url.split('/mecha-world/')[1],'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace(/<link[^>]+href="([^"]+\.css)"[^>]*>/g,(_,url)=>'<style>'+readFileSync(root+url.split('/mecha-world/')[1],'utf8')+'</style>');
writeFileSync('ko.html',html);
