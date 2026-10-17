/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as o}from"./vista-tridimensionale-4SvfTkzs.js";import"./index-D-2nz8K-.js";import"./glosse-in-vista-VgAfVu2e.js";const e="postprocessVertexShader",t=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;o.ShadersStore[e]||(o.ShadersStore[e]=t);const d={name:e,shader:t};export{d as postprocessVertexShader};
