/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-D3rbr_1R.js";import"./index-CZ72i0Yx.js";import"./glosse-in-vista-CXYpwwZD.js";const e="depthBoxBlurPixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec2 screenSize;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 colorDepth=vec4(0.0);for (int x=-OFFSET; x<=OFFSET; x++)
for (int y=-OFFSET; y<=OFFSET; y++)
colorDepth+=texture2D(textureSampler,vUV+vec2(x,y)/screenSize);gl_FragColor=(colorDepth/float((OFFSET*2+1)*(OFFSET*2+1)));}`;r.ShadersStore[e]||(r.ShadersStore[e]=o);const a={name:e,shader:o};export{a as depthBoxBlurPixelShader};
