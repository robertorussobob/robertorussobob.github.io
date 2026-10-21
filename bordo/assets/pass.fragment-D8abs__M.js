/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-D3rbr_1R.js";import"./index-CZ72i0Yx.js";import"./glosse-in-vista-CXYpwwZD.js";const e="passPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);}`;r.ShadersStore[e]||(r.ShadersStore[e]=a);const i={name:e,shader:a};export{i as passPixelShader};
