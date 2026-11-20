// Verify the shipped package without executing its Host/client or installer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=rel=>fs.readFileSync(path.join(root,rel));
const json=rel=>JSON.parse(read(rel));
const sha=b=>createHash('sha256').update(b).digest('hex');
function inside(rel){assert.ok(typeof rel==='string'&&!path.isAbsolute(rel));const full=path.resolve(root,rel),r=path.relative(root,full);assert.ok(r&&!r.startsWith('..')&&!path.isAbsolute(r));assert.ok(fs.statSync(full).isFile());return full;}
const pkg=json('package.json'),lock=json('package-lock.json');
assert.equal(pkg.version,lock.version);assert.equal(pkg.version,lock.packages[''].version);
assert.equal(pkg.dsh.bundle.patch,'cordis.patch.yml');inside(pkg.dsh.bundle.patch);
assert.ok(!['preinstall','install','postinstall','prepare','prepublish','postpublish'].some(k=>k in pkg.scripts));
const media=json('media/builtins.json');
assert.equal(media.schemaVersion,1);assert.equal(media.entries.length,3);
assert.deepEqual(media.entries.map(e=>e.id).sort(),['builtin:awakening','builtin:claude-code','builtin:codex']);
for(const entry of media.entries){
 assert.equal(entry.builtin,true);assert.equal(entry.removable,false);assert.equal(entry.kind,'video');assert.equal(entry.fit,'safe');
 assert.equal(entry.durationSeconds,22);assert.equal(entry.presentation.mode,'safe-camera');assert.equal(entry.license,'CC-BY-4.0');
 const url=new URL(entry.sourceUrl,'http://local');assert.ok(url.pathname.startsWith('/dsh-awakening/media/'));
 const rel='media/'+path.posix.basename(url.pathname),b=read(rel);assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256);assert.equal(b.toString('ascii',4,8),'ftyp');
 assert.ok(entry.presentation.keyframes.length>=2);for(const f of entry.presentation.keyframes){const[x,y,w,h]=f.safe;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1280&&y+h<=720);}
 for(const key of ['posterUrl','thumbnailUrl'])inside('media/'+path.posix.basename(new URL(entry[key],'http://local').pathname));
}
// The build whitelist is explicit, never discovered from user input or folders.
const profileSpecs=[
 {root:'tools/native-install',version:'2.0.19-next',exe:'2c12759a3c3f24f2e6776dae4e511cf5984b227f5e4322fd826fea647bf503b6',original:'204e1dcc32ff6a9b661200b7ab97bda1cbd449904e2eddb71c9309cf767e06b5'},
 {root:'tools/native-install/builds/2.0.21-next',version:'2.0.21-next',exe:'423feb86156366aa2bc3374933f579027aef44bcc439c5743b72231d480afc00',original:'16f2c62b1ccc98a968d9c7cf5edcd7af7a1e7690c2fba8cea361d1726d0db349'},
 {root:'tools/native-install/builds/2.0.22-next',version:'2.0.22-next',exe:'ed9d42ce15a8e5f081ad389807d8093d59e8831717680f479fdc59ad46984288',original:'c7057e19e777ff6423815268901ecfe30382323e0dc2e5405b7a7e915328607e',document:'lib/web-document-ZxxDXtoU.js'},
 {root:'tools/native-install/builds/2.0.23-next',version:'2.0.23-next',exe:'a56a858008a0c24d50e7c20ad651b51c5f5e646a8b98292df2ba0b0708e1bfd5',original:'003b66e87e2e7f78b4e05d3ac9a5ffce4c54a62efca87495b9a0fec075ae18eb',document:'lib/web-document-BSg-xuBI.js'},
 {root:'tools/native-install/builds/2.0.24-next',version:'2.0.24-next',exe:'37b45397eec580d32c8be1355e2065e01a83fa4c946749cb1d0acefca94cf3d8',original:'3bccf05a97aeb6bed3c3cc7ebe958533c0e6e4afa6c902d274776b572411aefa',document:'lib/web-document-BjG9-N6z.js'},
];
const checkedProfiles=[],nativeSyntax=new Set(),digestPattern=/^[a-f0-9]{64}$/;
const requiredRuntime=['runtime/safe-video.js','runtime/stage.js','runtime/bootstrap.js','media/builtins.json','media/boot.mp4','media/codex.mp4','media/claude-code.mp4'];
for(const spec of profileSpecs){
 inside(spec.root+'/policy.json');
 const policy=json(spec.root+'/policy.json');
 assert.equal(policy.desktopVersion,spec.version);assert.equal(policy.exeSha256,spec.exe);assert.equal(policy.originalSha256,spec.original);
 assert.ok(policy.packageVersions.includes(pkg.version),'Missing package version in '+spec.version);
 assert.match(policy.patchedSha256,digestPattern);assert.notEqual(policy.patchedSha256,policy.originalSha256);
 for(const rel of requiredRuntime)assert.ok(rel in policy.runtimeFiles,'Missing native pin in '+spec.version+': '+rel);
 if(checkedProfiles.length)assert.deepEqual(policy.runtimeFiles,checkedProfiles[0].policy.runtimeFiles,'Desktop builds must share the reviewed movies and player.');
 for(const[rel,digest]of Object.entries(policy.runtimeFiles)){inside(rel);assert.match(digest,digestPattern);assert.equal(sha(read(rel)),digest,'Runtime/media pin differs: '+spec.version+': '+rel);}
 const expectedPayloads=['lib/main.js',spec.document??'lib/web-document.js','lib/native-boot-carrier.mjs'];
 assert.deepEqual(Object.keys(policy.files).sort(),expectedPayloads.sort(),'Native replacement paths differ: '+spec.version);
 for(const[rel,digest]of Object.entries(policy.files)){
  assert.match(rel,/^lib\/[A-Za-z0-9_.-]+\.(?:js|mjs)$/);assert.match(digest,digestPattern);
  const local=spec.root+'/payload/'+rel.slice(4);inside(local);assert.equal(sha(read(local)),digest,'Native payload pin differs: '+local);nativeSyntax.add(local);
 }
 for(const helper of ['worker.ps1','launcher.ps1'])inside(spec.root+'/'+helper);
 checkedProfiles.push({spec,policy});
}
const policy=checkedProfiles[0].policy;
const client=read('lib/client.js').toString('utf8');assert.ok(client.startsWith('window.__ModuleLoader__.load('));new vm.Script(client);
const output=await build({absWorkingDir:root,entryPoints:[path.join(root,'src/entry.jsx')],bundle:true,write:false,format:'cjs',platform:'browser',external:['react'],target:['chrome120']});
const expected=`window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:function(require){\nvar module={exports:{}};var exports=module.exports;\n${output.outputFiles[0].text}\nreturn module.exports;\n}});\n`;
assert.equal(client,expected,'Compiled client is stale; run npm run build.');
for(const rel of ['lib/index.js','lib/animation-library.mjs','lib/builtins.mjs',...Object.keys(policy.runtimeFiles).filter(p=>p.endsWith('.js')),'tools/native-install/index.mjs','tools/native-install/profiles.mjs','tools/native-install/cli.mjs','tools/native-install/engine.mjs','tools/native-install/asar.mjs',...nativeSyntax])execFileSync(process.execPath,['--check',inside(rel)],{stdio:'pipe',windowsHide:true});
const shots=json('screenshots.json');assert.ok(shots.length>=1&&shots.length<=8);shots.forEach(inside);
inside('CREDITS.md');inside('licenses/ORIGINAL-ANIMATIONS-CC-BY-4.0.md');
console.log(JSON.stringify({passed:true,version:pkg.version,builtinMovies:3,desktopBuilds:checkedProfiles.map(p=>p.policy.desktopVersion),nativePinsPerBuild:Object.keys(policy.runtimeFiles).length,payloadPins:checkedProfiles.reduce((count,p)=>count+Object.keys(p.policy.files).length,0),registeredClient:true,clientReproducible:true,clientSha256:sha(Buffer.from(client)),screenshots:shots.length,installerExecuted:false}));
