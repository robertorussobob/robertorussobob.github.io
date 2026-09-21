/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as o}from"./vista-tridimensionale-BVJ1Shrj.js";import"./index-BNldl97H.js";import"./raffica-disegnata-R2Hgas5o.js";const e="postprocessVertexShader",t=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;o.ShadersStore[e]||(o.ShadersStore[e]=t);const d={name:e,shader:t};export{d as postprocessVertexShader};
