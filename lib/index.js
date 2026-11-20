import z from '@deepseek-ai/schemastery';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fileHandler } from './media.js';
import { createNativeRequestGuard, createNativeRoutes } from './native-api.js';
import { createAnimationLibrary, createLibraryRoutes } from './animation-library.mjs';

export const name='dsh-awakening';
// Register the document hook synchronously. Decoration must not hold up Host
// activation while optional services become available.
export const inject=[];
export const Config=z.object({
  enabled:z.boolean().default(true).volatile(),
  sound:z.boolean().default(true).volatile(),
  volume:z.number().min(0).max(100).step(1).default(85).volatile(),
  frequency:z.union([z.const('startup'),z.const('daily')]).default('startup').volatile(),
  timeoutSeconds:z.number().min(25).max(60).step(1).default(45).volatile(),
  animationId:z.string().default('builtin:awakening').volatile(),
  videoFit:z.union([z.const('cover'),z.const('contain')]).default('cover').volatile(),
});
// Both early boot and the deferred settings client use exactly this scene order.
const runtimeFiles=['scene/brand.js','scene/animation.js','scene/morph.js','scene/desktop-composition.js','scene/responsive-composition.js','scene/portrait-camera.js','safe-video.js','stage.js','bootstrap.js'];
const bootstrap=runtimeFiles.map(file=>readFileSync(new URL('../runtime/'+file,import.meta.url),'utf8')).join('\n');
const videoFile=fileURLToPath(new URL('../media/boot.mp4',import.meta.url));
const posterFile=fileURLToPath(new URL('../media/poster.png',import.meta.url));
const libraryCoverFile=posterFile;
const bundledMedia=[['codex.mp4','video/mp4'],['claude-code.mp4','video/mp4'],['codex-poster.png','image/png'],['claude-code-poster.png','image/png']];
const unbox=value=>value&&typeof value.get==='function'?value.get():value;
export function apply(ctx,config){
  let nativeGuard=null,libraryGuard=null;
  const native=createNativeRoutes({packageRoot:fileURLToPath(new URL('../',import.meta.url)),authorizeNative:request=>nativeGuard?.diagnose(request)??{authorized:false,reason:'native-policy-unavailable'}});
  const settings=()=>Object.fromEntries(['enabled','sound','volume','frequency','timeoutSeconds','animationId','videoFit'].map(key=>[key,unbox(config[key])]));
  const library=createAnimationLibrary();
  const libraryRoutes=createLibraryRoutes({library,authorizeRequest:request=>libraryGuard?.(request)===true,getSelectedId:()=>unbox(config.animationId)||'builtin:awakening'});
  ctx.inject(['webServer'],child=>{
    const guard=createNativeRequestGuard(child.webServer);
    nativeGuard=guard;
    const permits=request=>typeof child.webServer.permits==='function'&&child.webServer.permits({headers:request.headers,url:request.url})===true;
    libraryGuard=permits;
    child.effect(()=>()=>{if(nativeGuard===guard)nativeGuard=null;if(libraryGuard===permits)libraryGuard=null;});
    // Exact WebServer routes need the Host connection's own admission check.
    // Look up the connection on every request so a replaced service is never reused.
    function registerRoute(path, handle) {
      child.effect(() => child.webServer.register({
        kind: 'exact',
        path: '/dsh-awakening/' + path,
        handler(request, response) {
          let rejection = 503;
          try {
            const connection = child.get('connection');
            if (typeof connection?.requestRejection === 'function') {
              rejection = connection.requestRejection(request);
            }
          } catch {
            // A lookup or policy failure leaves the route unavailable.
          }
          if (rejection !== undefined) {
            const status = rejection === 401 || rejection === 403 ? rejection : 503;
            response.writeHead(status, { 'cache-control': 'no-store' });
            response.end();
            return;
          }
          return handle(request, response);
        },
      }));
    }
    registerRoute('media/boot.mp4', fileHandler(videoFile, 'video/mp4'));
    registerRoute('media/poster.png', fileHandler(posterFile, 'image/png'));
    registerRoute('media/library-cover.png', fileHandler(libraryCoverFile, 'image/png'));
    for (const [file, mime] of bundledMedia) {
      const source = fileURLToPath(new URL('../media/' + file, import.meta.url));
      registerRoute('media/' + file, fileHandler(source, mime));
    }
    registerRoute('native/status', native.status);
    registerRoute('native/prepare', native.prepare);
    registerRoute('native/cancel', native.cancel);
    const libraryHandlers = {
      list: libraryRoutes.list,
      import: libraryRoutes.importVideo,
      remove: libraryRoutes.remove,
      catalog: libraryRoutes.catalog,
      download: libraryRoutes.download,
      media: libraryRoutes.media,
    };
    for (const [route, handler] of Object.entries(libraryHandlers)) {
      registerRoute('library/' + route, handler);
    }
  });
  ctx.inject(['settings'],child=>child.effect(()=>child.settings.configure({auto:false},ctx.fiber)));
  ctx.on('webserver/index-inject',table=>{
    const saved=settings();let animation;
    try{animation=library.resolve(saved.animationId||'builtin:awakening',saved.videoFit);}catch{animation=library.resolve('builtin:awakening');}
    const options={version:'0.7.0',settings:saved,animation,sourceUrl:animation.sourceUrl,posterUrl:animation.posterUrl,autostart:true};
    table.push({kind:'global',name:'__DSH_AWAKENING_NATIVE__',value:{actionToken:native.token}});
    table.push({kind:'global',name:'__DSH_AWAKENING_OPTIONS__',value:options});
    table.push({kind:'global',name:'__DSH_AWAKENING_LIBRARY__',value:{actionToken:libraryRoutes.token}});
    table.push({kind:'script',placement:'head',text:bootstrap+'\nwindow.__DSH_AWAKENING_INSTALL__(window.__DSH_AWAKENING_OPTIONS__);'});
  });
}
export default {name,inject,Config,apply};
